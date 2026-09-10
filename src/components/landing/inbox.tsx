// The problem, drawn as the thing itself: a PR list. Titles are typical, none names a real project.
const UNSOLICITED = [
  { title: "Refactor the auth module", diff: "+2,140 −1,911" },
  { title: "Add AI auto-fix for flaky tests", diff: "+864 −12" },
  { title: "Migrate to a faster bundler", diff: "+312 −298" },
  { title: "Fix typo in README", diff: "+1 −1" },
  { title: "Fix typo in README", diff: "+1 −1" },
  { title: "Implement dark mode", diff: "+1,502 −40" },
  { title: "Bump all dependencies", diff: "+3,988 −3,760" },
  { title: "Improve error messages", diff: "+540 −233" },
  { title: "Fix typo in CONTRIBUTING", diff: "+1 −1" },
];

const Figure = ({ n, caption }: { n: string; caption: string }) => (
  <p className="mb-4 flex items-baseline gap-3">
    <span className="font-display text-[44px] font-bold leading-none tracking-[-0.03em] tabular-nums">{n}</span>
    <span className="max-w-[34ch] text-sm leading-snug text-ink-2">{caption}</span>
  </p>
);

export const Inbox = () => (
  <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
    <div className="min-w-0">
      <p className="label mb-4">without a queue · one week</p>
      <Figure n="9" caption="pull requests to read. None you asked for. Three from bots." />
      <div className="card overflow-hidden">
        <ul className="stagger font-mono text-[13px]">
          {UNSOLICITED.map((pr, i) => (
            <li key={i} className="grid grid-cols-[1fr_auto] items-baseline gap-3 border-b border-hairline px-4 py-2.5 text-ink-2 last:border-0">
              <span className="min-w-0 truncate"><span className="text-danger/80">unsolicited</span> · {pr.title}</span>
              <span className="whitespace-nowrap tabular-nums">{pr.diff}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
    <div className="min-w-0">
      <p className="label mb-4">with the queue · one week</p>
      <Figure n="1" caption="pull request, for a task you wrote, already checked. The rest never reached you." />
      <div className="card overflow-hidden">
        <ul className="font-mono text-[13px]">
          <li className="grid grid-cols-[1fr_auto] items-baseline gap-3 px-4 py-2.5">
            <span className="min-w-0 truncate text-ink"><span className="text-accent">ready</span> · fix: release expired claims on the board</span>
            <span className="whitespace-nowrap tabular-nums text-ink-2">+6 −1</span>
          </li>
          <li className="reveal pulse-once border-t border-hairline bg-accent-soft px-4 py-2.5 font-medium text-accent">Ready for one human review</li>
          {UNSOLICITED.slice(0, 7).map((_, i) => (
            <li key={i} aria-hidden className="border-t border-dashed border-hairline px-4 py-2.5 text-ink-2/45">never reached you</li>
          ))}
        </ul>
      </div>
    </div>
  </div>
);
