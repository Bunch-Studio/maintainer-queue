"use client";

import { useActionState } from "react";
import { createTask } from "@/app/dashboard/actions";

type Repo = { id: string; full_name: string };
type State = { error?: string; ok?: boolean };

const submit = async (_prev: State, formData: FormData): Promise<State> => createTask(formData);

const label = "mb-1.5 flex items-baseline justify-between font-mono text-xs text-ink-2";
const field = "w-full h-10 rounded-md border border-hairline bg-surface px-3 text-sm transition-[border-color,box-shadow] duration-150 hover:border-ink-2/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft disabled:opacity-60";

export const TaskForm = ({ repos }: { repos: Repo[] }) => {
  const [state, action, pending] = useActionState<State, FormData>(submit, {});

  return (
    <form action={action} className="space-y-5" aria-busy={pending}>
      <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
        <label className="block">
          <span className={label}>Repository</span>
          <select name="repo_id" required className={`${field} font-mono`} disabled={pending || repos.length === 0}>
            {repos.length === 0 && <option>Install the App first</option>}
            {repos.map((r) => <option key={r.id} value={r.id}>{r.full_name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className={label}>Issue #</span>
          <input name="issue_number" type="number" min={1} required className={`${field} font-mono tabular-nums`} placeholder="42" disabled={pending} />
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
          <span className={label}>Diff limit, lines</span>
          <input name="max_diff_lines" type="number" min={10} max={2000} defaultValue={200} className={`${field} font-mono tabular-nums`} disabled={pending} />
        </label>
      </div>

      <label className="flex items-center gap-2.5 font-mono text-xs text-ink-2">
        <input name="requires_screenshot" type="checkbox" className="size-4 accent-accent" disabled={pending} />
        this changes UI, so the PR must include a screenshot
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending || repos.length === 0}
          className="btn inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-medium text-ground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Posting…" : "Post task"}
        </button>
        {state.error && <p role="alert" className="font-mono text-xs text-danger">{state.error}</p>}
        {state.ok && <p role="status" className="font-mono text-xs text-accent">Posted. It is on the board now.</p>}
      </div>
    </form>
  );
};
