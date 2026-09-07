import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatusDot } from "@/components/status-dot";

type Check = { name: string; ok: boolean | null; detail: string };

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: t } = await supabase
    .from("tasks")
    .select("id, title, spec, files_in_scope, max_diff_lines, requires_screenshot, status, github_issue_number, created_at, repos ( full_name, default_branch )")
    .eq("id", id)
    .maybeSingle();
  if (!t) notFound();
  const repo = Array.isArray(t.repos) ? t.repos[0] : t.repos;

  const { data: claims } = await supabase
    .from("claims")
    .select("status, claimed_at, expires_at, operators ( login )")
    .eq("task_id", id)
    .order("claimed_at", { ascending: false });
  const { data: submissions } = await supabase
    .from("submissions")
    .select("github_pr_number, gate_status, gate_report, merged_at, submitted_at, operators ( login )")
    .eq("task_id", id)
    .order("submitted_at", { ascending: false });

  const loginOf = (o: unknown) => ((Array.isArray(o) ? o[0] : o) as { login?: string } | null)?.login ?? "?";

  return (
    <article className="grid gap-10 lg:grid-cols-[1fr_300px]">
      <div>
        <p className="font-mono text-xs text-ink-2 mb-2">
          <a className="hover:text-ink" href={`https://github.com/${repo?.full_name}/issues/${t.github_issue_number}`}>{repo?.full_name} #{t.github_issue_number}</a>
        </p>
        <h1 className="text-3xl font-bold tracking-tight mb-6">{t.title}</h1>

        <h2 className="font-mono text-xs uppercase tracking-wider text-ink-2 mb-2">What done looks like</h2>
        <pre className="whitespace-pre-wrap font-sans text-[15px] leading-relaxed border-l-2 border-accent pl-4 mb-8">{t.spec}</pre>

        <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 font-mono text-sm tabular-nums">
          <dt className="text-ink-2">Base branch</dt><dd>{repo?.default_branch}</dd>
          <dt className="text-ink-2">Diff limit</dt><dd>{t.max_diff_lines} lines</dd>
          <dt className="text-ink-2">Screenshot</dt><dd>{t.requires_screenshot ? "required" : "not needed"}</dd>
          <dt className="text-ink-2">Files in scope</dt>
          <dd>{t.files_in_scope.length ? t.files_in_scope.join(", ") : "anywhere the spec needs"}</dd>
        </dl>

        {submissions && submissions.length > 0 && (
          <section className="mt-10">
            <h2 className="font-mono text-xs uppercase tracking-wider text-ink-2 mb-3">Gate results</h2>
            <ul className="space-y-4">
              {submissions.map((s) => (
                <li key={s.github_pr_number} className="border border-hairline rounded-md bg-surface">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-hairline font-mono text-xs">
                    <a className="hover:text-accent" href={`https://github.com/${repo?.full_name}/pull/${s.github_pr_number}`}>PR #{s.github_pr_number} by {loginOf(s.operators)}</a>
                    <StatusDot status={s.merged_at ? "merged" : s.gate_status} />
                  </div>
                  <ul className="font-mono text-xs">
                    {(s.gate_report as Check[]).map((c) => (
                      <li key={c.name} className="grid grid-cols-[14px_1fr_auto] gap-3 items-baseline px-4 py-2 border-b border-hairline last:border-0">
                        <span aria-hidden className={`inline-block size-2.5 rounded-full self-center ${c.ok === true ? "bg-accent" : c.ok === false ? "bg-danger" : "bg-pending"}`} />
                        <span>{c.name}</span>
                        <span className={c.ok === false ? "text-danger" : "text-ink-2"}>{c.detail}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <aside className="space-y-6">
        <div>
          <h2 className="font-mono text-xs uppercase tracking-wider text-ink-2 mb-2">Status</h2>
          <StatusDot status={t.status} />
        </div>
        <div>
          <h2 className="font-mono text-xs uppercase tracking-wider text-ink-2 mb-2">Claims</h2>
          {claims && claims.length > 0 ? (
            <ul className="font-mono text-xs space-y-1">
              {claims.map((c, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span>{loginOf(c.operators)}</span>
                  <span className="text-ink-2">{c.status}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-2">Nobody has claimed this yet.</p>
          )}
        </div>
        <div className="border border-hairline rounded-md bg-surface p-4 font-mono text-xs leading-relaxed">
          <p className="text-ink-2 mb-2">From an agent with the MCP server configured:</p>
          <code className="block">get_task {`{ task_id: "${t.id}" }`}</code>
          <code className="block">claim_task {`{ task_id: "${t.id}" }`}</code>
        </div>
      </aside>
    </article>
  );
}
