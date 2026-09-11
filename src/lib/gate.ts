import "server-only";
import { getInstallationOctokit } from "@/lib/github/app";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { evaluate, issueNumberFromBody, revertedPrNumber, type GateCheck } from "@/lib/gate-rules";
import { must } from "@/lib/db";

export type { GateCheck };

export const GATE_NAME = `${process.env.NEXT_PUBLIC_SITE_NAME ?? "Maintainer Queue"} gate`;

type PullRequest = {
  number: number;
  id: number | bigint;
  title: string;
  body: string | null;
  additions: number;
  deletions: number;
  head: { sha: string };
  user: { login: string } | null;
  merged?: boolean;
  merged_at?: string | null;
};

type Octokit = Awaited<ReturnType<typeof getInstallationOctokit>>;
type RepoRef = { owner: string; repo: string };

const listChangedFiles = async (octokit: Octokit, ref: RepoRef, pullNumber: number) => {
  const files: string[] = [];
  for (let page = 1; page <= 30; page++) {
    const { data } = await octokit.request("GET /repos/{owner}/{repo}/pulls/{pull_number}/files", { ...ref, pull_number: pullNumber, per_page: 100, page });
    files.push(...data.map((f) => f.filename));
    if (data.length < 100) break;
  }
  return files;
};

// Contents read is enough to see whether the repo has any workflow files.
const hasWorkflows = async (octokit: Octokit, ref: RepoRef) => {
  try {
    const { data } = await octokit.request("GET /repos/{owner}/{repo}/contents/{path}", { ...ref, path: ".github/workflows" });
    return Array.isArray(data) && data.some((f) => /\.ya?ml$/.test(f.name));
  } catch {
    return false;
  }
};

// Evaluates a PR against its task and posts the verdict as a check run on the PR.
export const runGate = async (githubRepoId: number, pr: PullRequest) => {
  const db = createServiceRoleClient();
  const { data: repo } = must(
    await db.from("repos").select("id, installation_id, owner, name, full_name").eq("github_repo_id", githubRepoId).maybeSingle(),
  );
  if (!repo) return null;

  const issueNumber = issueNumberFromBody(pr.body);
  const { data: task } = issueNumber
    ? must(
        await db
          .from("tasks")
          .select("id, max_diff_lines, requires_screenshot, files_in_scope, status")
          .eq("repo_id", repo.id)
          .eq("github_issue_number", issueNumber)
          .maybeSingle(),
      )
    : { data: null };
  if (!task) return null; // not a task PR; stay silent

  const { data: claim } = must(
    await db
      .from("claims")
      .select("id, operator_id, operators ( login )")
      .eq("task_id", task.id)
      .in("status", ["active", "submitted"])
      .order("claimed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  );
  const claimer = claim
    ? ((Array.isArray(claim.operators) ? claim.operators[0] : claim.operators)?.login as string | undefined)
    : undefined;

  const octokit = await getInstallationOctokit(repo.installation_id);
  const ref = { owner: repo.owner, repo: repo.name };
  const [{ data: checkRuns }, { data: checkSuites }, workflows, changedFiles] = await Promise.all([
    octokit.request("GET /repos/{owner}/{repo}/commits/{ref}/check-runs", { ...ref, ref: pr.head.sha, per_page: 100 }),
    octokit.request("GET /repos/{owner}/{repo}/commits/{ref}/check-suites", { ...ref, ref: pr.head.sha, per_page: 100 }),
    hasWorkflows(octokit, ref),
    task.files_in_scope.length ? listChangedFiles(octokit, ref, pr.number) : Promise.resolve([]),
  ]);
  const appId = Number(process.env.GITHUB_APP_ID);
  const runs = checkRuns.check_runs.filter((run) => run.name !== GATE_NAME);
  const suites = checkSuites.check_suites.filter((s) => s.app?.id !== appId);

  const { checks, conclusion, failed, pending } = evaluate({
    task,
    claimer,
    author: pr.user?.login,
    body: pr.body ?? "",
    diff: pr.additions + pr.deletions,
    changedFiles,
    ci: { hasWorkflows: workflows, runs, suites },
  });

  const summary = checks
    .map((c) => `${c.ok === true ? "✅" : c.ok === false ? "❌" : "⏳"} ${c.name} — ${c.detail}`)
    .join("\n");

  await octokit.request("POST /repos/{owner}/{repo}/check-runs", {
    ...ref,
    name: GATE_NAME,
    head_sha: pr.head.sha,
    status: "completed",
    conclusion,
    output: {
      title: failed ? "Not ready for review" : pending ? "Waiting on CI" : "Ready for one human review",
      summary,
    },
  });

  // Only the claimer's own PR is recorded; a stranger's PR gets the verdict but no submission.
  if (claim && claimer === pr.user?.login) {
    must(await db.from("submissions").upsert(
      {
        task_id: task.id,
        claim_id: claim.id,
        operator_id: claim.operator_id,
        github_pr_number: pr.number,
        github_pr_id: Number(pr.id),
        gate_status: failed ? "failed" : pending ? "pending" : "passed",
        gate_report: checks,
      },
      { onConflict: "task_id,github_pr_number" },
    ));
    if (task.status === "claimed") {
      must(await db.from("tasks").update({ status: "submitted" }).eq("id", task.id));
      must(await db.from("claims").update({ status: "submitted" }).eq("id", claim.id));
    }
  }
  return { conclusion, checks };
};

export const recordMerge = async (githubRepoId: number, pr: PullRequest): Promise<string> => {
  const db = createServiceRoleClient();
  const { data: submission } = must(
    await db.from("submissions").select("id, task_id, operator_id").eq("github_pr_id", Number(pr.id)).maybeSingle(),
  );
  if (!submission) {
    await recordRevert(githubRepoId, pr);
    return `no submission for pr id ${pr.id}`;
  }
  {
    must(await db.from("submissions").update({ merged_at: pr.merged_at ?? new Date().toISOString() }).eq("id", submission.id));
    must(await db.from("tasks").update({ status: "merged" }).eq("id", submission.task_id));
    const { data: operator } = await db.from("operators").select("merged_count").eq("id", submission.operator_id).single();
    must(await db.from("operators").update({ merged_count: (operator?.merged_count ?? 0) + 1 }).eq("id", submission.operator_id));
  }
  await recordRevert(githubRepoId, pr);
  return `merged task ${submission.task_id}`;
};

// A merged revert of a task PR counts against the operator who shipped it.
const recordRevert = async (githubRepoId: number, pr: PullRequest) => {
  const revertedNumber = revertedPrNumber(pr.body);
  if (!revertedNumber) return;
  const db = createServiceRoleClient();
  const { data: reverted } = must(
    await db
      .from("submissions")
      .select("id, operator_id, reverted_at, tasks!inner ( repos!inner ( github_repo_id ) )")
      .eq("github_pr_number", revertedNumber)
      .eq("tasks.repos.github_repo_id", githubRepoId)
      .not("merged_at", "is", null)
      .maybeSingle(),
  );
  if (!reverted || reverted.reverted_at) return;
  must(await db.from("submissions").update({ reverted_at: pr.merged_at ?? new Date().toISOString() }).eq("id", reverted.id));
  const { data: operator } = await db.from("operators").select("reverted_count").eq("id", reverted.operator_id).single();
  must(await db.from("operators").update({ reverted_count: (operator?.reverted_count ?? 0) + 1 }).eq("id", reverted.operator_id));
};

// A task PR closed without merging puts the task back on the board.
export const recordClose = async (pr: PullRequest): Promise<string> => {
  const db = createServiceRoleClient();
  const { data: submission } = must(
    await db.from("submissions").select("id, task_id, claim_id, tasks!inner ( status )").eq("github_pr_id", Number(pr.id)).maybeSingle(),
  );
  if (!submission) return `no submission for pr id ${pr.id}`;
  const task = Array.isArray(submission.tasks) ? submission.tasks[0] : submission.tasks;
  if (task?.status !== "submitted") return `task is ${task?.status}, left alone`;
  must(await db.from("tasks").update({ status: "open" }).eq("id", submission.task_id));
  if (submission.claim_id) {
    must(await db.from("claims").update({ status: "released", released_at: new Date().toISOString() }).eq("id", submission.claim_id));
  }
  return `reopened task ${submission.task_id}`;
};
