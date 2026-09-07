import "server-only";
import { getInstallationOctokit } from "@/lib/github/app";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const GATE_NAME = `${process.env.NEXT_PUBLIC_SITE_NAME ?? "Maintainer Queue"} gate`;

type GateCheck = { name: string; ok: boolean | null; detail: string };

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

const issueNumberFromBody = (body: string | null) => {
  const match = body?.match(/(?:fixes|closes|resolves)\s+#(\d+)/i);
  return match ? Number(match[1]) : null;
};

// Evaluates a PR against its task and posts the verdict as a check run on the PR.
export const runGate = async (githubRepoId: number, pr: PullRequest) => {
  const db = createServiceRoleClient();
  const { data: repo } = await db
    .from("repos")
    .select("id, installation_id, owner, name, full_name")
    .eq("github_repo_id", githubRepoId)
    .maybeSingle();
  if (!repo) return null;

  const issueNumber = issueNumberFromBody(pr.body);
  const { data: task } = issueNumber
    ? await db
        .from("tasks")
        .select("id, max_diff_lines, requires_screenshot, status")
        .eq("repo_id", repo.id)
        .eq("github_issue_number", issueNumber)
        .maybeSingle()
    : { data: null };
  if (!task) return null; // not a task PR; stay silent

  const { data: claim } = await db
    .from("claims")
    .select("id, operator_id, operators ( login )")
    .eq("task_id", task.id)
    .in("status", ["active", "submitted"])
    .order("claimed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const claimer = claim
    ? ((Array.isArray(claim.operators) ? claim.operators[0] : claim.operators)?.login as string | undefined)
    : undefined;

  const octokit = await getInstallationOctokit(repo.installation_id);
  const { data: checkRuns } = await octokit.request(
    "GET /repos/{owner}/{repo}/commits/{ref}/check-runs",
    { owner: repo.owner, repo: repo.name, ref: pr.head.sha, per_page: 100 },
  );
  const others = checkRuns.check_runs.filter((run) => run.name !== GATE_NAME);
  const ciFailed = others.some((run) => run.conclusion && !["success", "neutral", "skipped"].includes(run.conclusion));
  const ciPending = others.some((run) => run.status !== "completed");

  const body = pr.body ?? "";
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  const diff = pr.additions + pr.deletions;

  const checks: GateCheck[] = [
    { name: "Task claimed by the PR author", ok: !!claimer && claimer === pr.user?.login, detail: claimer ? `claim: ${claimer}, author: ${pr.user?.login}` : "no active claim on this task" },
    { name: "Diff within the task limit", ok: diff <= task.max_diff_lines, detail: `${diff} / ${task.max_diff_lines} lines` },
    { name: "Repository CI", ok: ciFailed ? false : ciPending ? null : others.length > 0 ? true : null, detail: ciFailed ? "a check failed" : ciPending ? "still running" : others.length ? `${others.length} checks green` : "no CI on this repo" },
    { name: "PR text is short and links the task", ok: words <= 250 && /#\d+/.test(body), detail: `${words} words` },
  ];
  if (task.requires_screenshot) {
    checks.push({ name: "Screenshot attached", ok: /!\[[^\]]*\]\(/.test(body), detail: "UI change" });
  }

  const failed = checks.some((c) => c.ok === false);
  const pending = !failed && checks.some((c) => c.ok === null);
  const conclusion = failed ? "failure" : pending ? "neutral" : "success";
  const summary = checks
    .map((c) => `${c.ok === true ? "✅" : c.ok === false ? "❌" : "⏳"} ${c.name} — ${c.detail}`)
    .join("\n");

  await octokit.request("POST /repos/{owner}/{repo}/check-runs", {
    owner: repo.owner,
    repo: repo.name,
    name: GATE_NAME,
    head_sha: pr.head.sha,
    status: "completed",
    conclusion,
    output: {
      title: failed ? "Not ready for review" : pending ? "Waiting on CI" : "Ready for one human review",
      summary,
    },
  });

  if (claim) {
    await db.from("submissions").upsert(
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
    );
    if (task.status === "claimed") {
      await db.from("tasks").update({ status: "submitted" }).eq("id", task.id);
      await db.from("claims").update({ status: "submitted" }).eq("id", claim.id);
    }
  }
  return { conclusion, checks };
};

export const recordMerge = async (githubRepoId: number, pr: PullRequest) => {
  const db = createServiceRoleClient();
  const { data: submission } = await db
    .from("submissions")
    .select("id, task_id, operator_id")
    .eq("github_pr_id", Number(pr.id))
    .maybeSingle();
  if (!submission) return;

  await db.from("submissions").update({ merged_at: pr.merged_at ?? new Date().toISOString() }).eq("id", submission.id);
  await db.from("tasks").update({ status: "merged" }).eq("id", submission.task_id);
  const { data: operator } = await db.from("operators").select("merged_count").eq("id", submission.operator_id).single();
  await db
    .from("operators")
    .update({ merged_count: (operator?.merged_count ?? 0) + 1 })
    .eq("id", submission.operator_id);
};
