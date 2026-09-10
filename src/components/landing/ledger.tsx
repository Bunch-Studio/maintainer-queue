import type { LedgerData } from "@/lib/ledger";

const tone: Record<string, string> = {
  maintainer: "text-ink",
  agent: "text-ink-2",
  gate: "text-accent",
};

// The latest task through the queue, straight from the database. Every row is a recorded event.
export const Ledger = ({ data }: { data: LedgerData }) => (
  <div className="card overflow-hidden">
    <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-hairline px-5 py-4">
      <h3 className="font-display text-lg font-bold tracking-tight">The latest task through the queue</h3>
      <p className="font-mono text-xs text-ink-2">{data.date} · UTC · every row is a recorded event</p>
    </div>
    <ol className="font-mono text-[13px]">
      {data.events.map((e) => (
        <li key={`${e.t}-${e.what}`} className={`grid grid-cols-[8ch_minmax(0,1fr)] gap-x-4 border-b border-hairline px-5 py-3 last:border-0 ${e.final ? "bg-accent-soft" : ""}`}>
          <span className="tabular-nums text-ink-2">{e.t}</span>
          <span className="min-w-0">
            <span className={`${tone[e.who]} font-medium`}>{e.who}</span>
            <span className="text-ink"> · {e.what}</span>
            <span className="mt-0.5 block break-words text-ink-2">{e.detail}</span>
          </span>
        </li>
      ))}
    </ol>
    <p className="border-t border-hairline px-5 py-3 font-mono text-xs text-ink-2">{data.duration} from posted to merged. The maintainer read one PR that had already passed.</p>
  </div>
);
