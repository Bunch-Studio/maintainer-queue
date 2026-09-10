import "server-only";
import { getInstallationOctokit } from "@/lib/github/app";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { must } from "@/lib/db";
import { recordClose, recordMerge, runGate } from "@/lib/gate";

type RepoPayload = { id: number; name: string; full_name: string; private: boolean };
type Db = ReturnType<typeof createServiceRoleClient>;

const upsertRepos = async (db: Db, installationId: number, repos: RepoPayload[]) => {
  if (!repos.length) return;
  must(
    await db.from("repos").upsert(
      repos.map((r) => ({
        github_repo_id: r.id,
        installation_id: installationId,
        owner: r.full_name.split("/")[0],
        name: r.name,
        full_name: r.full_name,
        is_private: r.private,
        active: true,
      })),
      { onConflict: "github_repo_id" },
    ),
  );
};

// A repo that leaves takes its open tasks with it, so nothing stays claimable for a repo we can no longer gate.
export const closeTasksForRepos = async (db: Db, repoIds: string[]) => {
  if (!repoIds.length) return;
  const { data: tasks } = must(
    await db.from("tasks").update({ status: "closed" }).in("repo_id", repoIds).in("status", ["open", "claimed", "submitted"]).select("id"),
  );
  const taskIds = (tasks ?? []).map((t) => t.id);
  if (!taskIds.length) return;
  must(
    await db
      .from("claims")
      .update({ status: "released", released_at: new Date().toISOString() })
      .in("task_id", taskIds)
      .in("status", ["active", "submitted"]),
  );
};

const deactivate = async (db: Db, filter: { installationId?: number; githubRepoIds?: number[] }) => {
  let query = db.from("repos").update({ active: false });
  if (filter.installationId) query = query.eq("installation_id", filter.installationId);
  else if (filter.githubRepoIds?.length) query = query.in("github_repo_id", filter.githubRepoIds);
  else return;
  const { data } = must(await query.select("id"));
  await closeTasksForRepos(db, (data ?? []).map((r) => r.id));
};

// PRs from forks are missing from check_suite payloads, so ask GitHub which PRs the commit belongs to.
const pullsForCommit = async (db: Db, githubRepoId: number, sha: string) => {
  const { data: repo } = must(await db.from("repos").select("installation_id, owner, name").eq("github_repo_id", githubRepoId).maybeSingle());
  if (!repo) return [];
  const octokit = await getInstallationOctokit(repo.installation_id);
  const { data } = await octokit.request("GET /repos/{owner}/{repo}/commits/{commit_sha}/pulls", { owner: repo.owner, repo: repo.name, commit_sha: sha, per_page: 20 });
  const open = data.filter((pr) => pr.state === "open" && pr.head.sha === sha);
  // The list form lacks additions/deletions; the gate needs the full object.
  return Promise.all(
    open.map(async (pr) => (await octokit.request("GET /repos/{owner}/{repo}/pulls/{pull_number}", { owner: repo.owner, repo: repo.name, pull_number: pr.number })).data),
  );
};

// Throws on failure so the delivery is marked failed and retried.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const processDelivery = async (event: string, body: any) => {
  const db = createServiceRoleClient();

  if (event === "installation") {
    const id = body.installation.id as number;
    if (body.action === "created" || body.action === "unsuspend") await upsertRepos(db, id, body.repositories ?? []);
    else if (body.action === "deleted" || body.action === "suspend") await deactivate(db, { installationId: id });
  }

  if (event === "installation_repositories") {
    const id = body.installation.id as number;
    await upsertRepos(db, id, body.repositories_added ?? []);
    await deactivate(db, { githubRepoIds: (body.repositories_removed ?? []).map((r: RepoPayload) => r.id) });
  }

  if (event === "pull_request") {
    const repoId = body.repository.id as number;
    if (["opened", "synchronize", "reopened", "edited", "ready_for_review"].includes(body.action)) {
      await runGate(repoId, body.pull_request);
    } else if (body.action === "closed") {
      const result = body.pull_request.merged ? await recordMerge(repoId, body.pull_request) : await recordClose(body.pull_request);
      console.log(`pull_request.closed #${body.pull_request.number} merged=${body.pull_request.merged}: ${result}`);
    }
  }

  if (event === "check_suite" && body.action === "completed") {
    const repoId = body.repository.id as number;
    for (const pr of await pullsForCommit(db, repoId, body.check_suite.head_sha)) {
      await runGate(repoId, pr);
    }
  }
};
