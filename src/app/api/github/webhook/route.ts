import { NextResponse, type NextRequest } from "next/server";
import { getGitHubApp, getInstallationOctokit } from "@/lib/github/app";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { recordClose, recordMerge, runGate } from "@/lib/gate";

type RepoPayload = { id: number; name: string; full_name: string; private: boolean };

const upsertRepos = async (installationId: number, repos: RepoPayload[]) => {
  if (!repos.length) return;
  const db = createServiceRoleClient();
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
  );
};

const deactivateRepos = async (repoIds: number[]) => {
  if (!repoIds.length) return;
  const db = createServiceRoleClient();
  await db.from("repos").update({ active: false }).in("github_repo_id", repoIds);
};

export const POST = async (request: NextRequest) => {
  const payload = await request.text();
  const signature = request.headers.get("x-hub-signature-256") ?? "";
  const event = request.headers.get("x-github-event") ?? "";

  const valid = await getGitHubApp().webhooks.verify(payload, signature);
  if (!valid) return NextResponse.json({ error: "bad signature" }, { status: 401 });

  const body = JSON.parse(payload);

  if (event === "installation") {
    const id = body.installation.id as number;
    if (body.action === "created" || body.action === "unsuspend") {
      await upsertRepos(id, body.repositories ?? []);
    } else if (body.action === "deleted" || body.action === "suspend") {
      const db = createServiceRoleClient();
      await db.from("repos").update({ active: false }).eq("installation_id", id);
    }
  }

  if (event === "installation_repositories") {
    const id = body.installation.id as number;
    await upsertRepos(id, body.repositories_added ?? []);
    await deactivateRepos((body.repositories_removed ?? []).map((r: RepoPayload) => r.id));
  }

  if (event === "pull_request") {
    const repoId = body.repository.id as number;
    if (["opened", "synchronize", "reopened", "edited", "ready_for_review"].includes(body.action)) {
      await runGate(repoId, body.pull_request);
    } else if (body.action === "closed") {
      if (body.pull_request.merged) await recordMerge(repoId, body.pull_request);
      else await recordClose(body.pull_request);
    }
  }

  // CI finished: re-evaluate every open task PR on that commit so "waiting on CI" resolves.
  if (event === "check_suite" && body.action === "completed") {
    const repoId = body.repository.id as number;
    for (const pr of body.check_suite.pull_requests ?? []) {
      const { data: repo } = await createServiceRoleClient().from("repos").select("installation_id, owner, name").eq("github_repo_id", repoId).maybeSingle();
      if (!repo) break;
      const octokit = await getInstallationOctokit(repo.installation_id);
      const { data: full } = await octokit.request("GET /repos/{owner}/{repo}/pulls/{pull_number}", { owner: repo.owner, repo: repo.name, pull_number: pr.number });
      await runGate(repoId, full);
    }
  }

  return NextResponse.json({ ok: true });
};
