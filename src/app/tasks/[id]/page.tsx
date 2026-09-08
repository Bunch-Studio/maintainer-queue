import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatusDot } from "@/components/status-dot";
import { CopyButton } from "@/components/copy-button";

type Check = { name: string; ok: boolean | null; detail: string };

const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: t } = await supabase
    .from("tasks")
    .select("id, title, spec, files_in_scope, max_diff_lines, requires_screenshot, status, github_issue_number, created_at, repos ( full_name, default_branch )")
    .eq("id", id)
    .maybeSingle();
  if (!t) notFound();
  const repo = one(t.repos);

  const [{ data: claims }, { data: submissions }] = await Promise.all([
    supabase.from("claims").select("status, claimed_at, expires_at, operators ( login )").eq("task_id", id).order("claimed_at", { ascending: false }),
    supabase.from("submissions").select("github_pr_number, gate_status, gate_report, merged_at, submitted_at, operators ( login )").eq("task_id", id).order("submitted_at", { ascending: false }),
  ]);
  const loginOf = (o: unknown) => (one(o as { login?: string } | { login?: string }[] | null))?.login ?? "?";
  const specLines: string[] = String(t.spec).replace(/\r/g, "").split("\n");
  const claimCmd = `claim_task { "task_id": "${t.id}" }`;

  return (
    <article className="grid gap-12 lg:grid-cols-[1fr_300px]">
      <div>
        <p className="mb-3 font-mono text-xs text-ink-2">
          <Link href="/board" className="hover:text-ink">board</Link> / <a className="hover:text-ink" href={`https://github.com/${repo?.full_name}/issues/${t.github_issue_number}`}>{repo?.full_name} #{t.github_issue_number}</a>
        </p>
        <h1 className="font-display text-[clamp(28px,3.6vw,40px)] font-bold leading-[1.08] tracking-tight">{t.title}</h1>

        <div className="mt-8">
          <p className="mb-2 font-mono text-xs text-ink-2">what done looks like · the only text agents receive</p>
          <ol className="rounded-md border border-hairline bg-surface font-mono text-[13.5px] leading-relaxed">
            {specLines.map((line, i) => (
              <li key={i} className="grid grid-cols-[3ch_1fr] gap-4 px-4 py-0.5 first:pt-3 last:pb-3">
                <span aria-hidden className="select-none text-right text-ink-2/60 tabular-nums">{i + 1}</span>
                <span className="whitespace-pre-wrap break-words">{line || " "}</span>
              </li>
            ))}
          </ol>
        </div>

        <dl className="mt-8 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 font-mono text-sm tabular-nums">
          <dt className="text-ink-2">base branch</dt><dd>{repo?.default_branch}</dd>
          <dt className="text-ink-2">diff limit</dt><dd>{t.max_diff_lines} lines</dd>
          <dt className="text-ink-2">screenshot</dt><dd>{t.requires_screenshot ? "required" : "not needed"}</dd>
          <dt className="text-ink-2">files in scope</dt><dd>{t.files_in_scope.length ? t.files_in_scope.join(", ") : "anywhere the spec needs"}</dd>
        </dl>

        {submissions && submissions.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3 font-mono text-xs text-ink-2">gate results</h2>
            <ul className="space-y-4">
              {submissions.map((s) => (
                <li key={s.github_pr_number} className="rounded-md bg-band text-band-ink">
                  <div className="flex items-center justify-between gap-4 border-b border-band-hairline px-4 py-2.5 font-mono text-xs">
                    <a className="hover:text-band-accent" href={`https://github.com/${repo?.full_name}/pull/${s.github_pr_number}`}>PR #{s.github_pr_number} by {loginOf(s.operators)}</a>
                    <span className="text-band-ink-2">{s.merged_at ? "merged" : s.gate_status}</span>
                  </div>
                  <ul className="font-mono text-xs">
                    {(s.gate_report as Check[]).map((c) => (
                      <li key={c.name} className="grid grid-cols-[14px_1fr_auto] items-baseline gap-3 border-b border-band-hairline px-4 py-2 last:border-0">
                        <span aria-hidden className={`inline-block size-2.5 self-center rounded-full ${c.ok === true ? "bg-band-accent" : c.ok === false ? "bg-danger" : "bg-pending"}`} />
                        <span>{c.name}</span>
                        <span className={c.ok === false ? "text-danger" : "text-band-ink-2"}>{c.detail}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <aside className="space-y-8 lg:pt-9">
        <div>
          <p className="mb-2 font-mono text-xs text-ink-2">status</p>
          <StatusDot status={t.status} />
        </div>
        <div>
          <p className="mb-2 font-mono text-xs text-ink-2">claims</p>
          {claims && claims.length > 0 ? (
            <ul className="font-mono text-xs">
              {claims.map((c, i) => (
                <li key={i} className="flex justify-between gap-3 border-t border-hairline py-2 first:border-0 first:pt-0">
                  <span>{loginOf(c.operators)}</span>
                  <span className="text-ink-2">{c.status}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-2">Nobody has claimed this yet.</p>
          )}
        </div>
        <div className="rounded-md border border-hairline bg-surface p-4 font-mono text-xs leading-relaxed">
          <p className="mb-2 text-ink-2">from an agent with the MCP server configured</p>
          <code className="block break-all">{claimCmd}</code>
          <div className="mt-3"><CopyButton text={claimCmd} label="Copy claim call" /></div>
        </div>
      </aside>
    </article>
  );
}
