import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluate, inScope, revertedPrNumber, type GateInput } from "./gate-rules.ts";

const green = { status: "completed", conclusion: "success" };

const base = (over: Partial<GateInput> = {}): GateInput => ({
  task: { max_diff_lines: 30, requires_screenshot: false, files_in_scope: [] },
  claimer: "alice",
  author: "alice",
  body: "Trim the name before greeting.\n\nFixes #6",
  diff: 12,
  changedFiles: ["src/greet.js", "test/greet.test.js"],
  ci: { hasWorkflows: true, runs: [green], suites: [{ status: "completed" }] },
  ...over,
});

const byName = (checks: ReturnType<typeof evaluate>["checks"], name: string) => checks.find((c) => c.name === name)!;

describe("inScope", () => {
  it("matches directory prefixes with or without a trailing slash", () => {
    assert.equal(inScope("server/src/monitors/a.ts", ["server/src/monitors/"]), true);
    assert.equal(inScope("server/src/monitors/a.ts", ["server/src/monitors"]), true);
    assert.equal(inScope("server/src/monitorsx/a.ts", ["server/src/monitors"]), false);
  });
  it("matches exact paths, bare file names and globs", () => {
    assert.equal(inScope("src/greet.js", ["src/greet.js"]), true);
    assert.equal(inScope("server/src/monitor.service.ts", ["monitor.service.ts"]), true);
    assert.equal(inScope("src/a/b/c.test.js", ["src/**/*.test.js"]), true);
    assert.equal(inScope("src/a/b/c.js", ["src/**/*.test.js"]), false);
    assert.equal(inScope("src/x.js", ["src/*.js"]), true);
    assert.equal(inScope("src/a/x.js", ["src/*.js"]), false);
  });
  it("ignores leading ./ on either side", () => {
    assert.equal(inScope("./src/greet.js", ["./src/"]), true);
  });
});

describe("evaluate", () => {
  it("passes a claimed, small, green, linked PR", () => {
    const r = evaluate(base());
    assert.equal(r.conclusion, "success");
    assert.ok(r.checks.every((c) => c.ok === true));
  });

  it("fails when the author does not hold the claim", () => {
    const r = evaluate(base({ author: "mallory" }));
    assert.equal(r.conclusion, "failure");
    assert.equal(byName(r.checks, "Task claimed by the PR author").ok, false);
  });

  it("fails when the diff exceeds the limit", () => {
    assert.equal(evaluate(base({ diff: 31 })).conclusion, "failure");
  });

  it("skips the scope check when no scope is set", () => {
    assert.equal(evaluate(base()).checks.some((c) => c.name.includes("scope")), false);
  });

  it("fails and names files outside the scope", () => {
    const r = evaluate(base({ task: { max_diff_lines: 30, requires_screenshot: false, files_in_scope: ["src/"] }, changedFiles: ["src/greet.js", "README.md", "package.json"] }));
    const c = byName(r.checks, "Changes stay within files in scope");
    assert.equal(c.ok, false);
    assert.equal(c.detail, "outside scope: README.md, package.json");
    assert.equal(r.conclusion, "failure");
  });

  it("passes the scope check when every file matches", () => {
    const r = evaluate(base({ task: { max_diff_lines: 30, requires_screenshot: false, files_in_scope: ["src/greet.js", "test/"] } }));
    assert.equal(byName(r.checks, "Changes stay within files in scope").ok, true);
  });

  it("treats a repo with no workflows as CI-clean", () => {
    const r = evaluate(base({ ci: { hasWorkflows: false, runs: [], suites: [] } }));
    assert.equal(byName(r.checks, "Repository CI").ok, true);
    assert.equal(r.conclusion, "success");
  });

  it("waits while workflows exist but nothing has started yet", () => {
    const r = evaluate(base({ ci: { hasWorkflows: true, runs: [], suites: [] } }));
    assert.equal(byName(r.checks, "Repository CI").ok, null);
    assert.equal(r.conclusion, "neutral");
  });

  it("passes once every suite completed without producing a run", () => {
    const r = evaluate(base({ ci: { hasWorkflows: true, runs: [], suites: [{ status: "completed" }] } }));
    assert.equal(byName(r.checks, "Repository CI").ok, true);
  });

  it("waits on running checks and fails on a red one", () => {
    assert.equal(evaluate(base({ ci: { hasWorkflows: true, runs: [{ status: "in_progress", conclusion: null }], suites: [] } })).conclusion, "neutral");
    assert.equal(evaluate(base({ ci: { hasWorkflows: true, runs: [green, { status: "completed", conclusion: "failure" }], suites: [] } })).conclusion, "failure");
  });

  it("requires a short body that links the issue", () => {
    assert.equal(evaluate(base({ body: "no link here" })).conclusion, "failure");
    assert.equal(evaluate(base({ body: `${"word ".repeat(251)} #6` })).conclusion, "failure");
  });

  it("requires a screenshot only when the task asks", () => {
    const task = { max_diff_lines: 30, requires_screenshot: true, files_in_scope: [] };
    assert.equal(evaluate(base({ task })).conclusion, "failure");
    assert.equal(evaluate(base({ task, body: "Fixes #6 ![before](https://x/y.png)" })).conclusion, "success");
  });
});

describe("revertedPrNumber", () => {
  it("reads GitHub's revert body", () => {
    assert.equal(revertedPrNumber("Reverts egeoztass/mq-smoke#5"), 5);
    assert.equal(revertedPrNumber("This reverts #12 because"), 12);
    assert.equal(revertedPrNumber("Fixes #3"), null);
    assert.equal(revertedPrNumber(null), null);
  });
});
