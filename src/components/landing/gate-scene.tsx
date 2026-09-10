"use client";

import { useEffect, useState } from "react";

type Ok = boolean | null | undefined;
type Frame = {
  who: "agent" | "gate" | "ci" | "maintainer";
  log: string;
  hold: number;
  add: number;
  del: number;
  checks: [Ok, Ok, Ok, Ok, Ok];
  details: [string, string, string, string, string];
  verdict: string;
  tone: "pass" | "fail" | "wait" | "none";
  merged?: boolean;
};

const NAMES = ["Task claimed by the PR author", "Diff within the task limit", "Changes stay within files in scope", "Repository CI", "PR text is short and links the task"];
const D = ["claim matches author", "", "2 files, all in scope", "still running", "58 words · Fixes #42"] as const;

// One PR, start to finish. Every beat is something the real gate does. `hold` is how long each beat stays.
const FRAMES: Frame[] = [
  { who: "agent", log: "opened PR #57 from its operator's account", hold: 1500, add: 212, del: 4, checks: [undefined, undefined, undefined, undefined, undefined], details: ["", "", "", "", ""], verdict: "", tone: "none" },
  { who: "gate", log: "checked the claim and the diff", hold: 1400, add: 212, del: 4, checks: [true, false, undefined, undefined, undefined], details: [D[0], "", "", "", ""], verdict: "", tone: "none" },
  { who: "gate", log: "not ready: the diff is over the task limit", hold: 2200, add: 212, del: 4, checks: [true, false, true, null, true], details: [D[0], "", D[2], D[3], D[4]], verdict: "Not ready for review", tone: "fail" },
  { who: "agent", log: "read the verdict, trimmed the change, pushed again", hold: 1900, add: 34, del: 4, checks: [true, true, true, null, true], details: [D[0], "", D[2], D[3], D[4]], verdict: "Waiting on CI", tone: "wait" },
  { who: "ci", log: "2 checks green", hold: 1300, add: 34, del: 4, checks: [true, true, true, true, true], details: [D[0], "", D[2], "2 checks green", D[4]], verdict: "Waiting on CI", tone: "wait" },
  { who: "gate", log: "re-ran on its own: ready for one human review", hold: 2200, add: 34, del: 4, checks: [true, true, true, true, true], details: [D[0], "", D[2], "2 checks green", D[4]], verdict: "Ready for one human review", tone: "pass" },
  { who: "maintainer", log: "read one PR that had already passed, and merged it", hold: 2800, add: 34, del: 4, checks: [true, true, true, true, true], details: [D[0], "", D[2], "2 checks green", D[4]], verdict: "Merged", tone: "pass", merged: true },
];
const TOTAL = FRAMES.reduce((s, f) => s + f.hold, 0);
const LIMIT = 40;

const tone: Record<Frame["who"], string> = { agent: "text-ink-2", gate: "text-accent", ci: "text-ink-2", maintainer: "text-ink" };
const dot = (ok: Ok) => (ok === true ? "bg-accent" : ok === false ? "bg-danger" : ok === null ? "bg-pending" : "bg-hairline");
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

// One clock. Frame index, the progress sweep and the number tweens all derive from elapsed time.
const useClock = () => {
  const [state, set] = useState({ i: FRAMES.length - 1, progress: 1, add: 34, del: 4, still: true });
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const start = performance.now();
    let prevI = -1;
    let from = { add: FRAMES[0].add, del: FRAMES[0].del };
    let changedAt = start;
    const tick = (now: number) => {
      const t = (now - start) % TOTAL;
      let acc = 0;
      let i = 0;
      for (; i < FRAMES.length; i++) { if (t < acc + FRAMES[i].hold) break; acc += FRAMES[i].hold; }
      if (i !== prevI) {
        const prev = FRAMES[prevI < 0 ? FRAMES.length - 1 : prevI];
        from = { add: prev.add, del: prev.del };
        changedAt = now;
        prevI = i;
      }
      const k = ease(Math.min(1, (now - changedAt) / 700));
      const f = FRAMES[i];
      set({ i, progress: t / TOTAL, add: Math.round(from.add + (f.add - from.add) * k), del: Math.round(from.del + (f.del - from.del) * k), still: false });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return state;
};

export const GateScene = () => {
  const { i, progress, add, del, still } = useClock();
  const f = FRAMES[i];
  const diff = add + del;

  return (
    <div className="grid gap-3 rounded-2xl border border-hairline/70 bg-ground p-3 font-mono text-[13px] shadow-[0_1px_0_var(--hairline),0_20px_50px_-36px_color-mix(in_oklch,var(--ink)_40%,transparent)] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start" aria-live="polite">
      <div className="flex min-w-0 flex-col overflow-hidden rounded-xl bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex h-11 items-center justify-between gap-4 border-b border-hairline/70 px-4">
          <span className="flex min-w-0 items-center gap-2.5">
            <span aria-hidden className={`inline-block size-2 shrink-0 rounded-full transition-colors duration-500 ${f.merged ? "bg-ink" : "bg-accent"}`} />
            <span className="truncate font-medium text-ink">fix: release expired claims on the board</span>
          </span>
          <span className="shrink-0 tabular-nums text-ink-2">{f.merged ? "merged" : `+${add} −${del}`}</span>
        </div>
        <ul>
          {NAMES.map((name, k) => {
            const on = f.checks[k] !== undefined;
            const detail = k === 1 ? (on ? `${diff} / ${LIMIT} lines` : "") : f.details[k];
            return (
              <li key={name} className={`grid grid-cols-[14px_1fr_auto] items-baseline gap-3 border-b border-hairline/70 px-4 py-2.5 last:border-b-0 transition-[opacity,transform] duration-500 ease-out ${on ? "translate-x-0 opacity-100" : "-translate-x-1 opacity-35"}`}>
                <span aria-hidden className={`inline-block size-2.5 self-center rounded-full transition-colors duration-500 ${dot(f.checks[k])}`} />
                <span className="text-ink">{name}</span>
                <span className={`whitespace-nowrap tabular-nums transition-colors duration-500 ${f.checks[k] === false ? "text-danger" : "text-ink-2"}`}>{detail}</span>
              </li>
            );
          })}
        </ul>
        <div className={`relative h-11 overflow-hidden border-t border-hairline/70 transition-colors duration-500 ${f.tone === "fail" ? "bg-danger-soft" : f.tone === "pass" ? "bg-accent-soft" : "bg-transparent"}`}>
          <span key={f.verdict || "none"} className={`rise absolute inset-0 flex items-center px-4 font-medium ${f.tone === "fail" ? "text-danger" : f.tone === "pass" ? "text-accent" : f.tone === "wait" ? "text-ink-2" : "text-ink-2/50"}`}>
            {f.verdict || "waiting for the gate"}
          </span>
        </div>
      </div>

      <div className="flex min-w-0 flex-col overflow-hidden rounded-xl bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex h-11 items-center justify-between gap-4 border-b border-hairline/70 px-4 text-ink-2">
          <span>what happened</span>
          <span className="tabular-nums">{still ? "final state" : `${i + 1} / ${FRAMES.length}`}</span>
        </div>
        <ol>
          {FRAMES.map((fr, k) => (
            <li key={k} className={`grid grid-cols-[11ch_1fr] gap-x-3 border-b border-hairline/70 px-4 py-2.5 transition-[opacity,background-color] duration-500 ease-out last:border-b-0 ${k === i ? "bg-accent-soft/60 opacity-100" : k < i ? "opacity-60" : "opacity-30"}`}>
              <span className={`${tone[fr.who]} font-medium`}>{fr.who}</span>
              <span className="text-ink">{fr.log}</span>
            </li>
          ))}
        </ol>
      </div>

      {!still && (
        <div aria-hidden className="mx-1 mb-0.5 h-1 overflow-hidden rounded-full bg-hairline lg:col-span-2">
          <div className="h-full rounded-full bg-accent" style={{ width: `${progress * 100}%` }} />
        </div>
      )}
    </div>
  );
};
