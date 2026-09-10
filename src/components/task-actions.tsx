"use client";

import { useState, useTransition } from "react";
import { setTaskStatus } from "@/app/dashboard/actions";

// Close takes a task off the board and releases its claim; reopen puts it back.
export const TaskActions = ({ taskId, status }: { taskId: string; status: string }) => {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const next = status === "closed" ? "open" : ["open", "claimed", "submitted"].includes(status) ? "closed" : null;
  if (!next) return null;
  const label = next === "closed" ? "close" : "reopen";
  return (
    <span className="flex items-center gap-2">
      {error && <span role="alert" className="font-mono text-xs text-danger">{error}</span>}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await setTaskStatus(taskId, next);
            setError(r.error ?? null);
          })
        }
        className="btn rounded px-1.5 py-0.5 font-mono text-xs text-ink-2 hover:text-ink disabled:opacity-50"
      >
        {pending ? `${label}…` : label}
      </button>
    </span>
  );
};
