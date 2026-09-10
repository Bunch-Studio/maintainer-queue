"use client";

import { useEffect, useState } from "react";

type Ok = boolean | null | undefined;
type Frame = {
  log: string;
  who: "agent" | "gate" | "ci" | "maintainer";
  meta: string;
  checks: [Ok, Ok, Ok, Ok, Ok];
  details: [string, string, string, string, string];
  verdict: string;
  tone: "pass" | "fail" | "wait" | "none";
  merged?: boolean;
};

const NAMES = ["Task claimed by the PR author", "Diff within the task limit", "Changes stay within files in scope", "Repository CI", "PR text is short and links the task"];

// One PR, start to finish. Every beat is something the real gate does.
const FRAMES: Frame[] = [
  { who: "agent", log: "opened PR #57 from its operator's account", meta: "+212 −4", checks: [undefined, undefined, undefined, undefined, undefined], details: ["", "", "", "", ""], verdict: "", tone: "none" },
  { who: "gate", log: "checked the claim and the diff", meta: "+212 −4", checks: [true, false, undefined, undefined, undefined], details: ["claim matches author", "216 / 40 lines", "", "", ""], verdict: "", tone: "none" },
  { who: "gate", log: "not ready: the diff is over the task limit", meta: "+212 −4", checks: [true, false, true, null, true], details: ["claim matches author", "216 / 40 lines", "2 files, all in scope", "still running", "58 words · Fixes #42"], verdict: "Not ready for review", tone: "fail" },
  { who: "agent", log: "read the verdict, trimmed the change, pushed again", meta: "+34 −4", checks: [true, true, true, null, true], details: ["claim matches author", "38 / 40 lines", "2 files, all in scope", "still running", "58 words · Fixes #42"], verdict: "Waiting on CI", tone: "wait" },
  { who: "ci", log: "2 checks green", meta: "+34 −4", checks: [true, true, true, true, true], details: ["claim matches author", "38 / 40 lines", "2 files, all in scope", "2 checks green", "58 words · Fixes #42"], verdict: "Waiting on CI", tone: "wait" },
  { who: "gate", log: "re-ran on its own: ready for one human review", meta: "+34 −4", checks: [true, true, true, true, true], details: ["claim matches author", "38 / 40 lines", "2 files, all in scope", "2 checks green", "58 words · Fixes #42"], verdict: "Ready for one human review", tone: "pass" },
  { who: "maintainer", log: "read one PR that had already passed, and merged it", meta: "+34 −4", checks: [true, true, true, true, true], details: ["claim matches author", "38 / 40 lines", "2 files, all in scope", "2 checks green", "58 words · Fixes #42"], verdict: "Merged", tone: "pass", merged: true },
];

const STEP_MS = 1700;
const tone: Record<Frame["who"], string> = { agent: "text-ink-2", gate: "text-accent", ci: "text-ink-2", maintainer: "text-ink" };
const dot = (ok: Ok) => (ok === true ? "bg-accent" : ok === false ? "bg-danger" : ok === null ? "bg-pending" : "bg-hairline");

export const GateScene = () => {
  const [i, setI] = useState(0);
  const [still, setStill] = useState(false);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = setTimeout(() => { setStill(true); setI(FRAMES.length - 1); }, 0);
      return () => clearTimeout(t);
    }
    const id = setInterval(() => setI((n) => (n + 1) % FRAMES.length), STEP_MS);
    return () => clearInterval(id);
  }, []);

  const f = FRAMES[i];

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-12">
      <div className="min-w-0">
        <div className="card overflow-hidden font-mono text-[13px]" aria-live="polite">
          <div className="flex items-center justify-between gap-4 border-b border-hairline px-4 py-3">
            <span className="flex min-w-0 items-center gap-2.5">
              <span aria-hidden className={`inline-block size-2 shrink-0 rounded-full ${f.merged ? "bg-ink" : "bg-accent"}`} />
              <span className="truncate font-medium text-ink">fix: release expired claims on the board</span>
            </span>
            <span className="shrink-0 tabular-nums text-ink-2">{f.merged ? "merged" : f.meta}</span>
          </div>
          <ul>
            {NAMES.map((name, k) => (
              <li key={name} className={`grid grid-cols-[14px_1fr_auto] items-baseline gap-3 border-b border-hairline px-4 py-2.5 transition-opacity duration-300 ${f.checks[k] === undefined ? "opacity-35" : "opacity-100"}`}>
                <span aria-hidden className={`inline-block size-2.5 self-center rounded-full transition-colors duration-300 ${dot(f.checks[k])}`} />
                <span className="text-ink">{name}</span>
                <span className={`whitespace-nowrap tabular-nums transition-colors duration-300 ${f.checks[k] === false ? "text-danger" : "text-ink-2"}`}>{f.details[k]}</span>
              </li>
            ))}
          </ul>
          <div className={`verdict px-4 py-3 font-medium ${f.tone === "fail" ? "bg-danger-soft text-danger" : f.tone === "pass" ? "bg-accent-soft text-accent" : f.tone === "wait" ? "text-ink-2" : "text-ink-2/50"}`}>
            {f.verdict || "waiting for the gate"}
          </div>
        </div>
        {!still && (
          <div aria-hidden className="mt-3 h-[2px] w-full bg-hairline">
            <div className="h-full bg-accent transition-[width] duration-500" style={{ width: `${((i + 1) / FRAMES.length) * 100}%` }} />
          </div>
        )}
      </div>

      <ol className="min-w-0 divide-y divide-hairline border-y border-hairline font-mono text-[13px]">
        {FRAMES.map((fr, k) => (
          <li key={k} className={`grid grid-cols-[11ch_1fr] gap-x-4 px-1 py-3 transition-opacity duration-300 ${k === i ? "opacity-100" : k < i ? "opacity-60" : "opacity-25"} ${k === i ? "bg-surface" : ""}`}>
            <span className={`${tone[fr.who]} font-medium`}>{fr.who}</span>
            <span className="text-ink">{fr.log}</span>
          </li>
        ))}
      </ol>
    </div>
  );
};
