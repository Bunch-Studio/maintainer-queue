export type CardCheck = { name: string; ok: boolean | null; detail: string };

const dot = (ok: boolean | null) => (ok === true ? "bg-accent" : ok === false ? "bg-danger" : "bg-pending");

// The check run as a maintainer sees it on the PR. Rows arrive one by one when `arrive` is set.
export const CheckCard = ({ title, meta, checks, verdict, tone = "pass", arrive = false, className = "" }: {
  title: string;
  meta: string;
  checks: CardCheck[];
  verdict: string;
  tone?: "pass" | "fail" | "wait";
  arrive?: boolean;
  className?: string;
}) => (
  <div className={`card overflow-hidden font-mono text-[12.5px] ${className}`} role="group" aria-label="Gate check run">
    <div className="flex items-center justify-between gap-4 border-b border-hairline px-4 py-3">
      <span className="flex min-w-0 items-center gap-2.5">
        <span aria-hidden className="inline-block size-2 shrink-0 rounded-full bg-accent" />
        <span className="truncate font-medium text-ink">{title}</span>
      </span>
      <span className="shrink-0 tabular-nums text-ink-2">{meta}</span>
    </div>
    <ul>
      {checks.map((c) => (
        <li key={c.name} className={`grid grid-cols-[14px_1fr_auto] items-baseline gap-3 border-b border-hairline px-4 py-2.5 ${arrive ? "card-row" : ""}`}>
          <span aria-hidden className={`inline-block size-2.5 self-center rounded-full ${dot(c.ok)}`} />
          <span className="text-ink">{c.name}</span>
          <span className={`whitespace-nowrap tabular-nums ${c.ok === false ? "text-danger" : "text-ink-2"}`}>{c.detail}</span>
        </li>
      ))}
    </ul>
    <div className={`px-4 py-3 font-medium ${arrive ? "card-verdict" : ""} ${tone === "fail" ? "bg-danger-soft text-danger" : tone === "wait" ? "text-ink-2" : "bg-accent-soft text-accent"}`}>
      {verdict}
    </div>
  </div>
);
