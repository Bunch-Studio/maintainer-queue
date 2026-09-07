const tone: Record<string, string> = {
  open: "bg-accent",
  claimed: "bg-pending",
  submitted: "bg-pending",
  merged: "bg-accent",
  closed: "bg-ink-2",
  passed: "bg-accent",
  failed: "bg-danger",
  pending: "bg-pending",
};

export const StatusDot = ({ status }: { status: string }) => (
  <span className="inline-flex items-center gap-2 font-mono text-xs text-ink-2">
    <span aria-hidden className={`inline-block size-2.5 rounded-full ${tone[status] ?? "bg-ink-2"}`} />
    {status}
  </span>
);
