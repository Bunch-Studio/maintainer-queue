"use client";

import { useActionState } from "react";
import { createTask } from "@/app/dashboard/actions";

type Repo = { id: string; full_name: string };

const submit = async (_prev: { error?: string; ok?: boolean }, formData: FormData) => createTask(formData);

export const TaskForm = ({ repos }: { repos: Repo[] }) => {
  const [state, action, pending] = useActionState(submit, {});
  const field = "w-full h-10 px-3 rounded-md border border-hairline bg-surface text-sm disabled:opacity-60";

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
        <label className="block text-sm">
          <span className="block mb-1 text-ink-2">Repository</span>
          <select name="repo_id" required className={field} disabled={pending}>
            {repos.map((r) => <option key={r.id} value={r.id}>{r.full_name}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="block mb-1 text-ink-2">Issue #</span>
          <input name="issue_number" type="number" min={1} required className={`${field} font-mono`} placeholder="42" disabled={pending} />
        </label>
      </div>

      <label className="block text-sm">
        <span className="block mb-1 text-ink-2">What done looks like</span>
        <textarea
          name="spec"
          required
          rows={6}
          disabled={pending}
          className="w-full px-3 py-2 rounded-md border border-hairline bg-surface text-sm leading-relaxed disabled:opacity-60"
          placeholder={"Return the created monitor from createMonitor so POST /monitors answers with the document.\n\nAcceptance: a unit test on the service asserts the return value; the existing tests still pass; no changes outside monitor.service.ts and its test."}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
        <label className="block text-sm">
          <span className="block mb-1 text-ink-2">Files in scope <span className="text-ink-2/70">(optional, comma separated)</span></span>
          <input name="files_in_scope" className={`${field} font-mono`} placeholder="server/src/domain/monitors/" disabled={pending} />
        </label>
        <label className="block text-sm">
          <span className="block mb-1 text-ink-2">Diff limit (lines)</span>
          <input name="max_diff_lines" type="number" min={10} max={2000} defaultValue={200} className={`${field} font-mono`} disabled={pending} />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input name="requires_screenshot" type="checkbox" className="size-4 accent-accent" disabled={pending} />
        This changes UI, so the PR must include a screenshot
      </label>

      {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm text-accent">Task posted. It's on the board now.</p>}

      <button
        type="submit"
        disabled={pending || repos.length === 0}
        className="h-10 px-4 rounded-md bg-accent text-ground text-sm font-medium hover:opacity-90 active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? "Posting…" : "Post task"}
      </button>
    </form>
  );
};
