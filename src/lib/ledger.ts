import { createClient } from "@/lib/supabase/server";

export type LedgerEvent = { t: string; who: "maintainer" | "agent" | "gate" | "maintainer"; what: string; detail: string; final?: boolean };
export type LedgerData = { date: string; duration: string; events: LedgerEvent[]; mergedCount: number };

type Check = { name: string; ok: boolean | null; detail: string };
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

const clock = (iso: string) => new Date(iso).toISOString().slice(11, 19);
const mmss = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

const short = (checks: Check[]) =>
  checks
    .map((c) => {
      const mark = c.ok === true ? "✓" : c.ok === false ? "✗" : "…";
      if (/author/i.test(c.name)) return `author ${mark}`;
      if (/diff/i.test(c.name)) return `diff ${c.detail.replace(/ lines$/, "")} ${mark}`;
      if (/scope/i.test(c.name)) return `scope ${mark}`;
      if (/CI/.test(c.name)) return `CI ${c.detail}`;
      if (/text/i.test(c.name)) return `text ${c.detail} ${mark}`;
      if (/screenshot/i.test(c.name)) return `screenshot ${mark}`;
      return `${c.name} ${mark}`;
    })
    .join(" · ");

// The most recent task that went all the way through, as a timeline of what the database actually recorded.
export const loadLedger = async (): Promise<LedgerData | null> => {
  const supabase = await createClient();
  const [{ data: s }, { count }] = await Promise.all([
    supabase
      .from("submissions")
      .select("submitted_at, merged_at, github_pr_number, gate_report, tasks!inner ( title, created_at, max_diff_lines, github_issue_number, repos!inner ( full_name ) ), claims ( claimed_at, operators ( login ) )")
      .not("merged_at", "is", null)
      .order("merged_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("submissions").select("id", { count: "exact", head: true }).not("merged_at", "is", null),
  ]);
  if (!s || !s.merged_at) return null;
  const task = one(s.tasks);
  const repo = one(task?.repos);
  const claim = one(s.claims);
  const login = one(claim?.operators)?.login ?? "operator";
  if (!task || !repo) return null;

  const checks = (s.gate_report ?? []) as Check[];
  const events: LedgerEvent[] = [
    { t: clock(task.created_at), who: "maintainer", what: "posted a task", detail: `${repo.full_name} #${task.github_issue_number} · ${task.title} · ≤ ${task.max_diff_lines} lines` },
  ];
  if (claim?.claimed_at) events.push({ t: clock(claim.claimed_at), who: "agent", what: "claimed it over MCP", detail: `claim held by ${login} · expires in 48 h` });
  events.push({ t: clock(s.submitted_at), who: "agent", what: `opened PR #${s.github_pr_number}`, detail: "from the operator's own account" });
  if (checks.length) events.push({ t: clock(s.submitted_at), who: "gate", what: "ready for one human review", detail: short(checks) });
  events.push({ t: clock(s.merged_at), who: "maintainer", what: "merged", detail: "one human read one PR that had already passed", final: true });

  return {
    date: day(task.created_at),
    duration: mmss(new Date(s.merged_at).getTime() - new Date(task.created_at).getTime()),
    events,
    mergedCount: count ?? 0,
  };
};
