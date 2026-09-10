"use client";

import { useState, useTransition } from "react";
import { deleteAccount } from "@/app/dashboard/actions";

// Two clicks, no browser dialog: the second button only appears after the first.
export const DeleteAccount = () => {
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-3">
      {!armed ? (
        <button type="button" onClick={() => setArmed(true)} className="btn font-mono text-xs text-ink-2 hover:text-danger">
          delete account
        </button>
      ) : (
        <>
          <span className="font-mono text-xs text-ink-2">Removes your tokens, claims and submissions. Tasks you posted stay.</span>
          <button
            type="button"
            disabled={pending}
            onClick={() => start(async () => { await deleteAccount(); })}
            className="btn h-8 rounded-md border border-danger/50 px-3 font-mono text-xs text-danger hover:bg-danger-soft disabled:opacity-50"
          >
            {pending ? "deleting…" : "confirm delete"}
          </button>
          <button type="button" onClick={() => setArmed(false)} className="btn font-mono text-xs text-ink-2 hover:text-ink">
            keep it
          </button>
        </>
      )}
    </div>
  );
};
