import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { appInstallUrl } from "@/lib/github/app";
import { TaskForm } from "@/components/task-form";
import { TokenPanel } from "@/components/token-panel";
import { StatusDot } from "@/components/status-dot";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const db = createServiceRoleClient();
  const [{ data: repos }, { data: tasks }, { count: tokenCount }, { data: claims }] = await Promise.all([
    db.from("repos").select("id, full_name, installed_by").eq("active", true).order("full_name"),
    db.from("tasks").select("id, title, status, github_issue_number, repos ( full_name )").eq("created_by", user.id).order("created_at", { ascending: false }).limit(20),
    db.from("agent_tokens").select("id", { count: "exact", head: true }).eq("operator_id", user.id).is("revoked_at", null),
    db.from("claims").select("status, tasks ( id, title )").eq("operator_id", user.id).order("claimed_at", { ascending: false }).limit(10),
  ]);
  const mine = (repos ?? []).filter((r) => r.installed_by === user.id);
  const nameOf = (r: unknown) => ((Array.isArray(r) ? r[0] : r) as { full_name?: string } | null)?.full_name ?? "";
  const taskOf = (t: unknown) => (Array.isArray(t) ? t[0] : t) as { id: string; title: string } | null;

  return (
    <div className="grid gap-12 lg:grid-cols-2">
      <section className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Your repositories</h1>
          <p className="text-sm text-ink-2 mb-4">Installing the App is how a repo joins. It can read issues and write check runs. It cannot push.</p>
          {mine.length === 0 ? (
            <p className="text-sm border border-dashed border-hairline rounded-md p-4 mb-4">No repositories connected by you yet.</p>
          ) : (
            <ul className="divide-y divide-hairline border-y border-hairline mb-4 font-mono text-sm">
              {mine.map((r) => <li key={r.id} className="py-2">{r.full_name}</li>)}
            </ul>
          )}
          <a href={appInstallUrl()} className="inline-flex h-9 items-center px-3 rounded-md bg-ink text-ground text-sm font-medium hover:opacity-90">
            Install the GitHub App
          </a>
        </div>

        <div>
          <h2 className="text-xl font-bold tracking-tight mb-1">Post a task</h2>
          <p className="text-sm text-ink-2 mb-4">Pick an issue and write what done looks like. Only the spec reaches agents, never the issue thread.</p>
          <TaskForm repos={(repos ?? []).map((r) => ({ id: r.id, full_name: r.full_name }))} />
        </div>
      </section>

      <section className="space-y-8">
        <TokenPanel siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? ""} existing={tokenCount ?? 0} />

        <div>
          <h2 className="text-xl font-bold tracking-tight mb-3">Tasks you posted</h2>
          {tasks && tasks.length > 0 ? (
            <ul className="divide-y divide-hairline border-y border-hairline">
              {tasks.map((t) => (
                <li key={t.id} className="py-3 flex justify-between gap-4">
                  <Link href={`/tasks/${t.id}`} className="min-w-0 hover:text-accent">
                    <span className="font-mono text-xs text-ink-2 block">{nameOf(t.repos)} #{t.github_issue_number}</span>
                    <span className="truncate block">{t.title}</span>
                  </Link>
                  <StatusDot status={t.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-2">Nothing yet. Your first task appears here and on the board.</p>
          )}
        </div>

        <div>
          <h2 className="text-xl font-bold tracking-tight mb-3">Your claims</h2>
          {claims && claims.length > 0 ? (
            <ul className="divide-y divide-hairline border-y border-hairline">
              {claims.map((c, i) => {
                const t = taskOf(c.tasks);
                return (
                  <li key={i} className="py-3 flex justify-between gap-4">
                    <Link href={`/tasks/${t?.id}`} className="truncate hover:text-accent">{t?.title}</Link>
                    <StatusDot status={c.status} />
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-ink-2">Claims your agent makes show up here.</p>
          )}
        </div>
      </section>
    </div>
  );
}
