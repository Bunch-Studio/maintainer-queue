"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { createTask, listOpenIssues } from "@/app/dashboard/actions";

type Repo = { id: string; full_name: string };
type Issue = { number: number; title: string };
type State = { error?: string; ok?: boolean; at?: number };

const submit = async (_prev: State, formData: FormData): Promise<State> => ({ ...(await createTask(formData)), at: Date.now() });

const label = "mb-1.5 flex items-baseline justify-between font-mono text-xs text-ink-2";
const field = "w-full h-10 rounded-md border border-hairline bg-surface px-3 text-sm transition-[border-color,box-shadow] duration-150 hover:border-ink-2/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft disabled:opacity-60";

const trim = (title: string, max = 64) => (title.length > max ? `${title.slice(0, max - 1)}…` : title);

export const TaskForm = ({ repos }: { repos: Repo[] }) => {
  const [state, action, pending] = useActionState<State, FormData>(submit, {});
  const [repoId, setRepoId] = useState(repos[0]?.id ?? "");
  const [issues, setIssues] = useState<Issue[] | null>(null);
  const [issuesError, setIssuesError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const [q, setQ] = useState("");

  // Issues come from GitHub for the chosen repo, minus the ones that already have a task. Reload after a post so the picked one drops out.
  useEffect(() => {
    if (!repoId) return;
    startLoading(async () => {
      const r = await listOpenIssues(repoId);
      setIssues(r.issues ?? null);
      setIssuesError(r.error ?? null);
    });
  }, [repoId, state.at]);

  const noIssues = issues !== null && issues.length === 0;
  const shown = (issues ?? []).filter((i) => !q || `#${i.number} ${i.title}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <form action={action} className="space-y-5" aria-busy={pending}>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <label className="block">
          <span className={label}>Repository</span>
          <select name="repo_id" required value={repoId} onChange={(e) => setRepoId(e.target.value)} className={`${field} font-mono`} disabled={pending || repos.length === 0}>
            {repos.length === 0 && <option value="">Install the App first</option>}
            {repos.map((r) => <option key={r.id} value={r.id}>{r.full_name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className={label}><span>Issue</span><span>{loading ? "loading…" : issues ? `${issues.length} open without a task` : issuesError ? "type the number" : ""}</span></span>
          {issuesError ? (
            <input name="issue_number" type="number" min={1} required className={`${field} font-mono tabular-nums`} placeholder="42" disabled={pending} />
          ) : (
            <>
              {(issues?.length ?? 0) > 8 && (
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="filter by number or title" aria-label="Filter issues" className={`${field} mb-2 font-mono`} disabled={pending} />
              )}
              <select name="issue_number" required className={`${field} font-mono`} disabled={pending || loading || noIssues}>
                {loading && issues === null && <option value="">Loading issues…</option>}
                {noIssues && <option value="">No open issues without a task</option>}
                {shown.map((i) => <option key={i.number} value={i.number}>#{i.number} {trim(i.title)}</option>)}
              </select>
            </>
          )}
        </label>
      </div>

      <label className="block">
        <span className={label}><span>What done looks like</span><span>the only text agents see</span></span>
        <textarea
          name="spec"
          required
          rows={7}
          disabled={pending}
          className={`${field} h-auto py-2.5 leading-relaxed`}
          placeholder={"Return the created monitor from createMonitor so POST /monitors answers with the document.\n\nAcceptance: a unit test on the service asserts the return value; the existing tests still pass; no changes outside monitor.service.ts and its test."}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-[1fr_150px]">
        <label className="block">
          <span className={label}><span>Files in scope</span><span>optional, comma separated</span></span>
          <input name="files_in_scope" className={`${field} font-mono`} placeholder="server/src/domain/monitors/" disabled={pending} />
        </label>
        <label className="block">
          <span className={label}><span>Diff limit, lines</span><span>small is good</span></span>
          <input name="max_diff_lines" type="number" min={10} max={2000} defaultValue={60} className={`${field} font-mono tabular-nums`} disabled={pending} />
        </label>
      </div>

      <label className="flex items-center gap-2.5 font-mono text-xs text-ink-2">
        <input name="requires_screenshot" type="checkbox" className="size-4 accent-accent" disabled={pending} />
        this changes UI, so the PR must include a screenshot
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending || repos.length === 0 || (!issuesError && (loading || noIssues))}
          className="btn inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-medium text-ground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Posting…" : "Post task"}
        </button>
        {state.error && <p role="alert" className="font-mono text-xs text-danger">{state.error}</p>}
        {state.ok && <p role="status" className="font-mono text-xs text-accent">Posted. It is on the board now.</p>}
        {issuesError && <p role="alert" className="font-mono text-xs text-danger">Could not load issues: {issuesError}</p>}
      </div>
    </form>
  );
};
