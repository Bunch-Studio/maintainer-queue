// Pure gate rules. No I/O here so the verdict can be unit tested; gate.ts gathers the inputs.

export type GateCheck = { name: string; ok: boolean | null; detail: string };

export type GateInput = {
  task: { max_diff_lines: number; requires_screenshot: boolean; files_in_scope: string[] };
  claimer: string | undefined;
  author: string | undefined;
  body: string;
  diff: number;
  changedFiles: string[];
  ci: {
    hasWorkflows: boolean;
    runs: { status: string; conclusion: string | null }[];
    suites: { status: string | null }[];
  };
};

const normalize = (path: string) => path.replace(/^\.?\//, "").trim();

const globToRegExp = (glob: string) => {
  const escaped = glob
    .split("**")
    .map((part) => part.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*"))
    .join(".*");
  return new RegExp(`^${escaped}$`);
};

// An entry is a directory prefix, an exact path, a glob, or a bare file name.
export const inScope = (file: string, scope: string[]) => {
  const f = normalize(file);
  return scope.map(normalize).filter(Boolean).some((entry) => {
    if (entry.includes("*")) return globToRegExp(entry).test(f);
    if (entry.endsWith("/")) return f.startsWith(entry);
    if (f === entry || f.startsWith(`${entry}/`)) return true;
    return !entry.includes("/") && f.split("/").pop() === entry;
  });
};

const ciCheck = ({ hasWorkflows, runs, suites }: GateInput["ci"]): GateCheck => {
  const name = "Repository CI";
  if (runs.some((r) => r.conclusion && !["success", "neutral", "skipped"].includes(r.conclusion))) {
    return { name, ok: false, detail: "a check failed" };
  }
  if (runs.some((r) => r.status !== "completed")) return { name, ok: null, detail: "still running" };
  if (runs.length) return { name, ok: true, detail: `${runs.length} checks green` };
  if (!hasWorkflows) return { name, ok: true, detail: "no CI on this repo" };
  if (!suites.length || suites.some((s) => s.status !== "completed")) {
    return { name, ok: null, detail: "waiting for CI to start" };
  }
  return { name, ok: true, detail: "no workflow ran on this commit" };
};

export const evaluate = (input: GateInput) => {
  const { task, claimer, author, body, diff, changedFiles, ci } = input;
  const words = body.trim().split(/\s+/).filter(Boolean).length;

  const checks: GateCheck[] = [
    {
      name: "Task claimed by the PR author",
      ok: !!claimer && claimer === author,
      detail: claimer ? `claim: ${claimer}, author: ${author}` : "no active claim on this task",
    },
    { name: "Diff within the task limit", ok: diff <= task.max_diff_lines, detail: `${diff} / ${task.max_diff_lines} lines` },
  ];

  if (task.files_in_scope.length) {
    const outside = changedFiles.filter((f) => !inScope(f, task.files_in_scope));
    checks.push({
      name: "Changes stay within files in scope",
      ok: outside.length === 0,
      detail: outside.length
        ? `outside scope: ${outside.slice(0, 3).join(", ")}${outside.length > 3 ? ` +${outside.length - 3}` : ""}`
        : `${changedFiles.length} file${changedFiles.length === 1 ? "" : "s"}, all in scope`,
    });
  }

  checks.push(ciCheck(ci));
  checks.push({ name: "PR text is short and links the task", ok: words <= 250 && /#\d+/.test(body), detail: `${words} words` });
  if (task.requires_screenshot) {
    checks.push({ name: "Screenshot attached", ok: /!\[[^\]]*\]\(/.test(body), detail: "UI change" });
  }

  const failed = checks.some((c) => c.ok === false);
  const pending = !failed && checks.some((c) => c.ok === null);
  const conclusion = failed ? "failure" : pending ? "neutral" : "success";
  return { checks, conclusion, failed, pending } as const;
};

// GitHub's revert button writes "Reverts owner/repo#123" into the PR body.
export const revertedPrNumber = (body: string | null) => {
  const match = body?.match(/\bReverts\s+(?:[\w.-]+\/[\w.-]+)?#(\d+)/i);
  return match ? Number(match[1]) : null;
};
