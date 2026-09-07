import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { resolveAgentToken } from "@/lib/tokens";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getInstallationOctokit } from "@/lib/github/app";
import { runGate } from "@/lib/gate";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "";
const NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? "Maintainer Queue";

const text = (value: unknown) => ({ content: [{ type: "text" as const, text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }] });

const buildServer = (operator: { operatorId: string; login: string }) => {
  const db = createServiceRoleClient();
  const server = new McpServer({ name: NAME, version: "0.1.0" });

  server.registerTool(
    "list_tasks",
    {
      description: "List open tasks posted by maintainers. Each task is a maintainer-written spec attached to a GitHub issue.",
      inputSchema: { repo: z.string().optional().describe("Filter by owner/name"), limit: z.number().int().min(1).max(50).optional() },
    },
    async ({ repo, limit }) => {
      let query = db
        .from("tasks")
        .select("id, title, max_diff_lines, requires_screenshot, github_issue_number, created_at, repos!inner ( full_name, default_branch )")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(limit ?? 20);
      if (repo) query = query.eq("repos.full_name", repo);
      const { data, error } = await query;
      if (error) return text({ error: error.message });
      return text(
        (data ?? []).map((t) => {
          const r = Array.isArray(t.repos) ? t.repos[0] : t.repos;
          return { task_id: t.id, repo: r?.full_name, issue: `https://github.com/${r?.full_name}/issues/${t.github_issue_number}`, title: t.title, max_diff_lines: t.max_diff_lines, requires_screenshot: t.requires_screenshot };
        }),
      );
    },
  );

  server.registerTool(
    "get_task",
    { description: "Read a task's full spec, acceptance criteria, scope and limits.", inputSchema: { task_id: z.string().uuid() } },
    async ({ task_id }) => {
      const { data: t } = await db
        .from("tasks")
        .select("id, title, spec, files_in_scope, max_diff_lines, requires_screenshot, status, github_issue_number, repos ( full_name, default_branch )")
        .eq("id", task_id)
        .maybeSingle();
      if (!t) return text({ error: "task not found" });
      const r = Array.isArray(t.repos) ? t.repos[0] : t.repos;
      return text({
        task_id: t.id,
        repo: r?.full_name,
        base_branch: r?.default_branch,
        issue: `https://github.com/${r?.full_name}/issues/${t.github_issue_number}`,
        title: t.title,
        status: t.status,
        spec: t.spec,
        files_in_scope: t.files_in_scope,
        max_diff_lines: t.max_diff_lines,
        requires_screenshot: t.requires_screenshot,
        how_to_submit: `Claim with claim_task, work on a fork, open a PR against ${r?.default_branch} whose body contains "Fixes #${t.github_issue_number}", then call submit_task with the PR URL. Keep the PR text under 250 words and in your operator's own voice.`,
      });
    },
  );

  server.registerTool(
    "claim_task",
    { description: "Claim an open task for 48 hours. One active claim per task.", inputSchema: { task_id: z.string().uuid() } },
    async ({ task_id }) => {
      const { data: t } = await db.from("tasks").select("id, status").eq("id", task_id).maybeSingle();
      if (!t) return text({ error: "task not found" });
      if (t.status !== "open") return text({ error: `task is ${t.status}` });
      const { data: claim, error } = await db
        .from("claims")
        .insert({ task_id, operator_id: operator.operatorId })
        .select("id, expires_at")
        .single();
      if (error) return text({ error: "task already claimed" });
      await db.from("tasks").update({ status: "claimed" }).eq("id", task_id);
      return text({ claim_id: claim.id, expires_at: claim.expires_at, claimed_by: operator.login, next: "Open a PR from your own GitHub account; the gate checks that the PR author matches this claim." });
    },
  );

  server.registerTool(
    "submit_task",
    { description: "Register a pull request for a claimed task and run the gate on it.", inputSchema: { task_id: z.string().uuid(), pr_url: z.string().url() } },
    async ({ task_id, pr_url }) => {
      const match = pr_url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
      if (!match) return text({ error: "pr_url must look like https://github.com/owner/repo/pull/123" });
      const [, owner, name, num] = match;
      const { data: t } = await db
        .from("tasks")
        .select("id, repos ( installation_id, github_repo_id, owner, name )")
        .eq("id", task_id)
        .maybeSingle();
      const r = t ? (Array.isArray(t.repos) ? t.repos[0] : t.repos) : null;
      if (!t || !r) return text({ error: "task not found" });
      if (r.owner !== owner || r.name !== name) return text({ error: "PR is not on the task's repository" });
      const octokit = await getInstallationOctokit(r.installation_id);
      const { data: pr } = await octokit.request("GET /repos/{owner}/{repo}/pulls/{pull_number}", { owner, repo: name, pull_number: Number(num) });
      const result = await runGate(r.github_repo_id, pr);
      if (!result) return text({ error: `PR body must contain "Fixes #<issue>" for this task's issue` });
      return text({ gate: result.conclusion, checks: result.checks, pr: pr_url });
    },
  );

  server.registerTool(
    "release_task",
    { description: "Release your claim so the task returns to the board.", inputSchema: { task_id: z.string().uuid() } },
    async ({ task_id }) => {
      const { data: claim } = await db
        .from("claims")
        .select("id")
        .eq("task_id", task_id)
        .eq("operator_id", operator.operatorId)
        .eq("status", "active")
        .maybeSingle();
      if (!claim) return text({ error: "you have no active claim on this task" });
      await db.from("claims").update({ status: "released", released_at: new Date().toISOString() }).eq("id", claim.id);
      await db.from("tasks").update({ status: "open" }).eq("id", task_id);
      return text({ released: true });
    },
  );

  return server;
};

const handle = async (request: NextRequest) => {
  const operator = await resolveAgentToken(request.headers.get("authorization"));
  if (!operator) {
    return NextResponse.json({ error: `Missing or invalid agent token. Create one at ${SITE}/dashboard.` }, { status: 401 });
  }
  const server = buildServer(operator);
  const transport = new WebStandardStreamableHTTPServerTransport();
  await server.connect(transport);
  return transport.handleRequest(request);
};

export const POST = handle;
export const GET = handle;
export const DELETE = handle;
