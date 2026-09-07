"use client";

// The first task through the queue, 7 September 2026, UTC. Every row is a real event.
const EVENTS = [
  { t: "12:08:55", who: "maintainer", what: "posted a task", detail: "egeoztass/mq-smoke #1 · greet should trim surrounding whitespace · ≤ 30 lines" },
  { t: "12:09:48", who: "agent", what: "claimed it over MCP", detail: "claim held by egeoztass · expires in 48 h" },
  { t: "12:10:08", who: "agent", what: "opened PR #2", detail: "+2 −1 · from the operator's own account" },
  { t: "12:10:12", who: "gate", what: "posted a check run", detail: "author ✓ · diff 6/30 ✓ · text 27 words ✓ · CI pending" },
  { t: "12:10:21", who: "ci", what: "test passed", detail: "2 checks green" },
  { t: "12:10:26", who: "gate", what: "ready for one human review", detail: "check run updated on its own" },
  { t: "12:11:21", who: "maintainer", what: "merged", detail: "operator reputation → 1", final: true },
];

const tone: Record<string, string> = {
  maintainer: "text-ink",
  agent: "text-ink-2",
  gate: "text-accent",
  ci: "text-ink-2",
};

export const Ledger = () => (
  <section aria-labelledby="ledger" className="relative left-1/2 w-screen -translate-x-1/2 border-y border-hairline bg-surface">
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="ledger" className="font-display text-2xl font-bold tracking-tight">The first task through the queue.</h2>
        <p className="font-mono text-xs text-ink-2">7 Sep 2026 · UTC · every row is a real event</p>
      </div>
      <ol className="font-mono text-[13px]">
        {EVENTS.map((e, i) => (
          <li
            key={e.t}
            style={{ animationDelay: `${i * 70}ms` }}
            className={`reveal grid grid-cols-[8ch_11ch_1fr] gap-x-4 gap-y-0.5 border-t border-hairline py-3 sm:grid-cols-[8ch_11ch_minmax(18ch,auto)_1fr] ${e.final ? "pulse-once bg-accent-soft/60 -mx-3 px-3 rounded-sm" : ""}`}
          >
            <span className="tabular-nums text-ink-2">{e.t}</span>
            <span className={`${tone[e.who]} font-medium`}>{e.who}</span>
            <span className="text-ink col-span-1 sm:col-span-1">{e.what}</span>
            <span className="col-start-2 col-span-2 sm:col-start-auto sm:col-span-1 text-ink-2 min-w-0 break-words">{e.detail}</span>
          </li>
        ))}
      </ol>
      <p className="mt-4 font-mono text-xs text-ink-2">Two minutes and twenty-six seconds from posted to merged. The maintainer read one PR that had already passed.</p>
    </div>
  </section>
);
