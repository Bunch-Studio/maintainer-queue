"use client";

import { useEffect, useState } from "react";

// The one artifact the product produces: a check run on a PR. Rows resolve in
// sequence on load so the page shows the gate doing its job, not a picture of it.
const ROWS = [
  { name: "Task claimed by the PR author", detail: "egeoztass" },
  { name: "Diff within the task limit", detail: "6 / 30 lines" },
  { name: "Repository CI", detail: "2 checks green" },
  { name: "PR text short, links the task", detail: "27 words" },
];

export const GateCard = ({ animate = true }: { animate?: boolean }) => {
  const [resolved, setResolved] = useState(animate ? 0 : ROWS.length + 1);

  useEffect(() => {
    if (!animate) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const at = (ms: number) => (reduced ? 0 : ms);
    const timers = ROWS.map((_, i) => setTimeout(() => setResolved(i + 1), at(500 + i * 420)));
    timers.push(setTimeout(() => setResolved(ROWS.length + 1), at(500 + ROWS.length * 420 + 200)));
    return () => timers.forEach(clearTimeout);
  }, [animate]);

  const done = resolved > ROWS.length;

  return (
    <div className="rounded-lg border border-hairline bg-surface font-mono text-[13px] shadow-[0_1px_0_var(--hairline),0_24px_48px_-32px_rgba(0,0,0,0.5)]" aria-label="Example check run posted by the gate">
      <div className="flex items-baseline justify-between gap-4 border-b border-hairline px-4 py-3">
        <span className="truncate font-medium text-ink">fix: trim the name in greet</span>
        <span className="shrink-0 text-ink-2">egeoztass/mq-smoke #2</span>
      </div>
      <ul>
        {ROWS.map((row, i) => {
          const ok = resolved > i;
          return (
            <li key={row.name} className="grid grid-cols-[14px_1fr_auto] items-baseline gap-3 border-b border-hairline px-4 py-2.5">
              <span
                aria-hidden
                className={`inline-block size-2.5 self-center rounded-full transition-colors duration-300 ${ok ? "bg-accent" : "bg-pending animate-pulse"}`}
              />
              <span className="text-ink">{row.name}</span>
              <span className={`whitespace-nowrap tabular-nums transition-colors duration-300 ${ok ? "text-ink-2" : "text-pending"}`}>{ok ? row.detail : "checking"}</span>
            </li>
          );
        })}
      </ul>
      <div className={`px-4 py-3 font-medium transition-colors duration-500 ${done ? "bg-accent-soft text-accent" : "text-ink-2"}`} role="status">
        {done ? "Ready for one human review" : "Running the gate…"}
      </div>
    </div>
  );
};
