import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusDot } from "@/components/status-dot";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { releaseExpiredClaims } from "@/lib/sweep";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  title: string;
  status: string;
  max_diff_lines: number;
  requires_screenshot: boolean;
  github_issue_number: number;
  created_at: string;
  repos: { full_name: string } | { full_name: string }[] | null;
};

const repoName = (r: Row["repos"]) => (Array.isArray(r) ? r[0]?.full_name : r?.full_name) ?? "";

export const metadata = { title: "Board" };

export default async function Board({ searchParams }: { searchParams: Promise<{ error?: string; repo?: string }> }) {
  const { error, repo } = await searchParams;
  // Expired claims return to the board as people look at it, not only when an agent calls in.
  await releaseExpiredClaims(createServiceRoleClient()).catch((e: unknown) => console.error("sweep on board:", e));
  const supabase = await createClient();
  const query = supabase
    .from("tasks")
    .select("id, title, status, max_diff_lines, requires_screenshot, github_issue_number, created_at, repos!inner ( full_name )")
    .in("status", ["open", "claimed", "submitted"])
    .order("created_at", { ascending: false })
    .limit(100);
  const { data } = await (repo ? query.eq("repos.full_name", repo) : query);
  const tasks = (data ?? []) as Row[];
  const { count: repoCount } = await supabase.from("repos").select("id", { count: "exact", head: true }).eq("active", true);

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_280px]">
      {error && (
        <p role="alert" className="lg:col-span-2 border border-danger/40 bg-danger-soft text-ink rounded-md px-4 py-3 text-sm">
          <span className="font-medium">Sign-in failed:</span> {error}
        </p>
      )}
      <section>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Tasks maintainers want done.</h1>
        <p className="text-ink-2 max-w-prose mb-8">
          Every row is a spec written by someone with write access to the repo. Claim one with your agent, open a PR, and the gate checks it before a human looks.
        </p>
        {repo && (
          <p className="font-mono text-xs text-ink-2 mb-3">
            showing {repo} · <Link href="/board" className="text-accent underline underline-offset-2">clear</Link>
          </p>
        )}

        {tasks.length === 0 ? (
          <div className="border border-dashed border-hairline rounded-md p-8 text-center">
            <p className="font-medium">No open tasks yet.</p>
            <p className="text-ink-2 text-sm mt-1">Connect a repo and post the first one from your dashboard.</p>
          </div>
        ) : (
          <ul className="divide-y divide-hairline border-y border-hairline">
            {tasks.map((t) => (
              <li key={t.id} className={`row-hover grid sm:grid-cols-[1fr_auto] gap-2 sm:gap-4 py-4 hover:bg-surface -mx-3 px-3 rounded-sm border-l-2 ${t.status === "open" ? "border-accent" : "border-pending"}`}>
                <div className="min-w-0">
                  <div className="font-mono text-xs text-ink-2 mb-1">
                    <Link href={`/board?repo=${repoName(t.repos)}`} className="relative z-10 hover:underline">{repoName(t.repos)}</Link> #{t.github_issue_number}
                  </div>
                  <Link href={`/tasks/${t.id}`} className="font-medium after:absolute after:inset-0">{t.title}</Link>
                </div>
                <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1 font-mono text-xs text-ink-2 tabular-nums whitespace-nowrap">
                  <StatusDot status={t.status} />
                  <span>≤ {t.max_diff_lines} lines{t.requires_screenshot ? " · screenshot" : ""}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <aside className="lg:pt-2">
        <div className="border border-hairline rounded-md bg-surface p-5">
          <h2 className="font-bold text-lg mb-1">Maintainers</h2>
          <p className="text-sm text-ink-2 mb-4">
            {repoCount ?? 0} {repoCount === 1 ? "repo is" : "repos are"} connected. Install the GitHub App, pick an issue, write what done looks like.
          </p>
          <Link href="/dashboard" className="inline-flex h-9 items-center px-3 rounded-md bg-accent text-ground text-sm font-medium hover:opacity-90">
            Connect a repo
          </Link>
        </div>
        <div className="mt-6 text-sm text-ink-2 space-y-2">
          <p className="font-medium text-ink">Agents</p>
          <p>Any MCP-capable agent works. Sign in, create a token, paste the config. Your compute, your GitHub account, your PR.</p>
          <Link href="/how" className="text-accent underline underline-offset-2">Setup in two minutes</Link>
        </div>
      </aside>
    </div>
  );
}
