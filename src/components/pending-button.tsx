"use client";

import { useFormStatus } from "react-dom";

// A submit button that shows its own pending state, so a server-action form answers the click at once.
export const PendingButton = ({ children, pendingLabel, className }: { children: React.ReactNode; pendingLabel: string; className: string }) => {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={`${className} disabled:cursor-progress disabled:opacity-60`}>
      {pending ? pendingLabel : children}
    </button>
  );
};
