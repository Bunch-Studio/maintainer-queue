import type { LedgerData } from "@/lib/ledger";

const tone: Record<string, string> = {
  maintainer: "text-band-ink",
  agent: "text-band-ink-2",
  gate: "text-band-accent",
};

// The latest task through the queue, straight from the database. Every row is a recorded event.
export const Ledger = ({ data }: { data: LedgerData }) => (
  <section aria-labelledby="ledger" className="relative left-1/2 w-screen -translate-x-1/2 bg-band text-band-ink">
    <div className="mx-auto max-w-5xl px-6 py-14">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="ledger" className="font-display text-2xl font-bold tracking-tight">The latest task through the queue.</h2>
        <p className="font-mono text-xs text-band-ink-2">{data.date} · UTC · every row is a recorded event</p>
      </div>
      <ol className="font-mono text-[13px]">
        {data.events.map((e, i) => (
          <li
            key={`${e.t}-${e.what}`}
            style={{ animationDelay: `${i * 70}ms` }}
            className={`reveal grid grid-cols-[8ch_11ch_1fr] gap-x-4 gap-y-0.5 border-t border-band-hairline py-3.5 sm:grid-cols-[8ch_11ch_minmax(18ch,auto)_1fr] ${e.final ? "-mx-3 rounded-sm bg-band-surface px-3" : ""}`}
          >
            <span className="tabular-nums text-band-ink-2">{e.t}</span>
            <span className={`${tone[e.who]} font-medium`}>{e.who}</span>
            <span className="text-band-ink">{e.what}</span>
            <span className="col-start-2 col-span-2 min-w-0 break-words text-band-ink-2 sm:col-start-auto sm:col-span-1">{e.detail}</span>
          </li>
        ))}
      </ol>
      <p className="mt-5 font-mono text-xs text-band-ink-2">{data.duration} from posted to merged. The maintainer read one PR that had already passed.</p>
    </div>
  </section>
);
