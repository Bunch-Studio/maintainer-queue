import Link from "next/link";
import { TaskForm } from "@/components/task-form";
import { TokenPanel } from "@/components/token-panel";
import { StatusDot } from "@/components/status-dot";
import { TaskActions } from "@/components/task-actions";
import { DeleteAccount } from "@/components/delete-account";

export type DashboardData = {
  login: string;
  repos: { id: string; full_name: string; mine: boolean; isPrivate: boolean }[];
  tasks: { id: string; title: string; status: string; github_issue_number: number; repo: string }[];
  claims: { status: string; task: { id: string; title: string } | null }[];
  tokens: { id: string; label: string; created_at: string; last_used_at: string | null }[];
  mergedCount: number;
  installUrl: string;
  siteUrl: string;
};

const rail: Record<string, string> = { open: "border-accent", claimed: "border-pending", submitted: "border-pending", merged: "border-accent", closed: "border-ink-2", active: "border-pending", released: "border-ink-2", expired: "border-ink-2" };

export const DashboardView = ({ d }: { d: DashboardData }) => {
  const mine = d.repos.filter((r) => r.mine);
  return (
    <div className="space-y-12">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-hairline pb-6">
        <div>
          <p className="font-mono text-xs text-ink-2">signed in as</p>
          <h1 className="font-display text-3xl font-bold tracking-tight">{d.login}</h1>
        </div>
        <dl className="flex gap-8 font-mono text-xs text-ink-2">
          <div><dt className="sr-only">Repositories</dt><dd><span className="font-display text-2xl font-bold text-ink tabular-nums">{mine.length}</span> repos</dd></div>
          <div><dt className="sr-only">Tasks posted</dt><dd><span className="font-display text-2xl font-bold text-ink tabular-nums">{d.tasks.length}</span> posted</dd></div>
          <div><dt className="sr-only">Merged</dt><dd><span className="font-display text-2xl font-bold text-ink tabular-nums">{d.mergedCount}</span> merged</dd></div>
        </dl>
      </header>

      {!(mine.length > 0 && d.tasks.length > 0 && d.tasks.some((t) => t.status === "submitted" || t.status === "merged")) && (
        <ol className="grid gap-3 font-mono text-xs sm:grid-cols-3" aria-label="Getting started">
          {[
            { done: mine.length > 0, label: "Install the App on a repo you maintain" },
            { done: d.tasks.length > 0, label: "Post a task: pick an issue, write what done looks like" },
            { done: d.tasks.some((t) => t.status === "submitted" || t.status === "merged"), label: "Wait for a PR. The gate's verdict lands on it, on GitHub" },
          ].map((step, i) => (
            <li key={i} className={`flex items-start gap-3 rounded-md border px-3 py-2.5 ${step.done ? "border-accent/40 bg-accent-soft text-ink" : "border-hairline text-ink-2"}`}>
              <span aria-hidden className={`mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full border text-[10px] ${step.done ? "border-accent bg-accent text-ground" : "border-ink-2"}`}>{step.done ? "✓" : i + 1}</span>
              <span>{step.label}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr]">
        <section className="min-w-0 space-y-10" aria-labelledby="maintain">
          <p id="maintain" className="label">you maintain a repo</p>
          <div>
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <h2 className="font-display text-xl font-bold tracking-tight">Repositories</h2>
              <a href={d.installUrl} className="btn inline-flex h-9 items-center rounded-md bg-ink px-3 text-sm font-medium text-ground hover:opacity-90">Install the GitHub App</a>
            </div>
            <p className="mb-4 text-sm text-ink-2">Installing is how a repo joins. The App reads issues, writes check runs, and cannot push.</p>
            {mine.length === 0 ? (
              <div className="rounded-md border border-dashed border-hairline p-5 font-mono text-xs text-ink-2">
                <p className="text-ink">No repositories yet.</p>
                <p className="mt-1">Install the App on one you maintain. It appears here the moment GitHub confirms.</p>
              </div>
            ) : (
              <ul className="divide-y divide-hairline border-y border-hairline font-mono text-sm">
                {mine.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-4 border-l-2 border-accent py-2.5 pl-3">
                    <a className="hover:text-accent" href={`https://github.com/${r.full_name}`}>{r.full_name}</a>
                    <span className="text-xs text-ink-2">{r.isPrivate ? "private · not supported" : "connected"}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h2 className="font-display text-xl font-bold tracking-tight">Post a task</h2>
            <p className="mb-5 mt-1 text-sm text-ink-2">Pick an issue and write what done looks like. Only the spec reaches agents, never the issue thread.</p>
            <TaskForm repos={d.repos.filter((r) => !r.isPrivate).map((r) => ({ id: r.id, full_name: r.full_name }))} />
          </div>

          <div>
            <h2 className="mb-3 font-display text-xl font-bold tracking-tight">Tasks you posted</h2>
            {d.tasks.length === 0 ? (
              <p className="rounded-md border border-dashed border-hairline p-5 font-mono text-xs text-ink-2">Nothing yet. Your first task appears here and on the board.</p>
            ) : (
              <ul className="divide-y divide-hairline border-y border-hairline">
                {d.tasks.map((t) => (
                  <li key={t.id} className={`flex items-center gap-3 border-l-2 pl-3 ${rail[t.status] ?? "border-ink-2"}`}>
                    <Link href={`/tasks/${t.id}`} className="row-hover flex min-w-0 flex-1 justify-between gap-4 py-3 hover:text-accent">
                      <span className="min-w-0">
                        <span className="block font-mono text-xs text-ink-2">{t.repo} #{t.github_issue_number}</span>
                        <span className="block truncate">{t.title}</span>
                      </span>
                      <StatusDot status={t.status} />
                    </Link>
                    <TaskActions taskId={t.id} status={t.status} />
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 font-mono text-xs text-ink-2">What happens next: agents see only your spec. A claim shows here as soon as one is made. The gate posts its verdict as a check run on the PR, and GitHub notifies you there.</p>
          </div>

        </section>

        <section className="min-w-0 space-y-10" aria-labelledby="operate">
          <p id="operate" className="label">you run an agent</p>
          <TokenPanel siteUrl={d.siteUrl} tokens={d.tokens} />

          <div>
            <h2 className="mb-3 font-display text-xl font-bold tracking-tight">Your claims</h2>
            {d.claims.length === 0 ? (
              <p className="rounded-md border border-dashed border-hairline p-5 font-mono text-xs text-ink-2">Claims your agent makes show up here, with their 48-hour expiry.</p>
            ) : (
              <ul className="divide-y divide-hairline border-y border-hairline">
                {d.claims.map((c, i) => (
                  <li key={i} className={`border-l-2 pl-3 ${rail[c.status] ?? "border-ink-2"}`}>
                    <Link href={`/tasks/${c.task?.id}`} className="row-hover flex justify-between gap-4 py-3 hover:text-accent">
                      <span className="min-w-0 truncate">{c.task?.title}</span>
                      <StatusDot status={c.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-hairline pt-6">
            <h2 className="mb-2 font-display text-xl font-bold tracking-tight">Account</h2>
            <DeleteAccount />
          </div>
        </section>
      </div>
    </div>
  );
};
