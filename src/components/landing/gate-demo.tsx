"use client";

import { useMemo, useState } from "react";

type Ci = "green" | "pending" | "failed";

// The same rules the real gate applies, so people can break a PR and watch the verdict change.
export const GateDemo = () => {
  const [diff, setDiff] = useState(6);
  const [limit, setLimit] = useState(30);
  const [claimer, setClaimer] = useState(true);
  const [ci, setCi] = useState<Ci>("green");
  const [words, setWords] = useState(27);
  const [links, setLinks] = useState(true);

  const checks = useMemo(
    () => [
      { name: "Task claimed by the PR author", ok: claimer, detail: claimer ? "claim matches author" : "PR author holds no claim" },
      { name: "Diff within the task limit", ok: diff <= limit, detail: `${diff} / ${limit} lines` },
      { name: "Repository CI", ok: ci === "green" ? true : ci === "pending" ? null : false, detail: ci === "green" ? "checks green" : ci === "pending" ? "still running" : "a check failed" },
      { name: "PR text short and linked", ok: words <= 250 && links, detail: `${words} words${links ? " · Fixes #1" : " · no issue link"}` },
    ],
    [diff, limit, claimer, ci, words, links],
  );
  const failed = checks.some((c) => c.ok === false);
  const pending = !failed && checks.some((c) => c.ok === null);
  const verdict = failed ? "Not ready for review" : pending ? "Waiting on CI" : "Ready for one human review";

  const field = "h-9 rounded-md border border-hairline bg-ground px-2 font-mono text-xs";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <form className="space-y-5 font-mono text-xs" onSubmit={(e) => e.preventDefault()} aria-label="Adjust a pretend pull request">
        <label className="block">
          <span className="flex justify-between text-ink-2"><span>Diff size</span><span className="tabular-nums text-ink">{diff} lines</span></span>
          <input type="range" min={0} max={400} value={diff} onChange={(e) => setDiff(Number(e.target.value))} className="mt-2 w-full accent-accent" />
        </label>
        <label className="block">
          <span className="flex justify-between text-ink-2"><span>Task limit set by the maintainer</span><span className="tabular-nums text-ink">{limit} lines</span></span>
          <input type="range" min={10} max={400} step={10} value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="mt-2 w-full accent-accent" />
        </label>
        <label className="block">
          <span className="flex justify-between text-ink-2"><span>PR description</span><span className="tabular-nums text-ink">{words} words</span></span>
          <input type="range" min={0} max={600} step={5} value={words} onChange={(e) => setWords(Number(e.target.value))} className="mt-2 w-full accent-accent" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2 text-ink-2">
            <input type="checkbox" checked={claimer} onChange={(e) => setClaimer(e.target.checked)} className="size-4 accent-accent" />
            author holds the claim
          </label>
          <label className="flex items-center gap-2 text-ink-2">
            <input type="checkbox" checked={links} onChange={(e) => setLinks(e.target.checked)} className="size-4 accent-accent" />
            body says Fixes #1
          </label>
        </div>
        <label className="block">
          <span className="text-ink-2">Repository CI</span>
          <select value={ci} onChange={(e) => setCi(e.target.value as Ci)} className={`${field} mt-2 w-full`}>
            <option value="green">green</option>
            <option value="pending">still running</option>
            <option value="failed">failed</option>
          </select>
        </label>
      </form>

      <div className="self-start rounded-lg border border-hairline bg-surface font-mono text-[13px] shadow-[0_1px_0_var(--hairline),0_24px_48px_-32px_rgba(0,0,0,0.45)]" role="status" aria-live="polite">
        <div className="flex items-baseline justify-between gap-4 border-b border-hairline px-4 py-3">
          <span className="font-medium">fix: trim the name in greet</span>
          <span className="text-ink-2 tabular-nums">+{Math.ceil(diff * 0.6)} −{Math.floor(diff * 0.4)}</span>
        </div>
        <ul>
          {checks.map((c) => (
            <li key={c.name} className="grid grid-cols-[14px_1fr_auto] items-baseline gap-3 border-b border-hairline px-4 py-2.5">
              <span aria-hidden className={`inline-block size-2.5 self-center rounded-full transition-colors duration-300 ${c.ok === true ? "bg-accent" : c.ok === false ? "bg-danger" : "bg-pending"}`} />
              <span>{c.name}</span>
              <span className={`whitespace-nowrap tabular-nums transition-colors duration-300 ${c.ok === false ? "text-danger" : "text-ink-2"}`}>{c.detail}</span>
            </li>
          ))}
        </ul>
        <div className={`px-4 py-3 font-medium transition-colors duration-400 ${failed ? "bg-danger-soft text-danger" : pending ? "text-ink-2" : "bg-accent-soft text-accent"}`}>
          {verdict}
        </div>
      </div>
    </div>
  );
};
