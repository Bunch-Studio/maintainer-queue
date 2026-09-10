import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { appInstallUrl } from "@/lib/github/app";
import { DashboardView, type DashboardData } from "@/components/dashboard/dashboard-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/signin?next=%2Fdashboard");

  const db = createServiceRoleClient();
  const [{ data: operator }, { data: repos }, { data: tasks }, { data: tokens }, { data: claims }] = await Promise.all([
    db.from("operators").select("login, merged_count").eq("id", user.id).single(),
    db.from("repos").select("id, full_name, installed_by, is_private").eq("active", true).order("full_name"),
    db.from("tasks").select("id, title, status, github_issue_number, repos ( full_name )").eq("created_by", user.id).order("created_at", { ascending: false }).limit(20),
    db.from("agent_tokens").select("id, label, created_at, last_used_at").eq("operator_id", user.id).is("revoked_at", null).order("created_at", { ascending: false }),
    db.from("claims").select("status, tasks ( id, title )").eq("operator_id", user.id).order("claimed_at", { ascending: false }).limit(10),
  ]);

  const data: DashboardData = {
    login: operator?.login ?? (user.user_metadata?.user_name as string) ?? "you",
    repos: (repos ?? []).map((r) => ({ id: r.id, full_name: r.full_name, mine: r.installed_by === user.id, isPrivate: r.is_private })),
    tasks: (tasks ?? []).map((t) => ({ id: t.id, title: t.title, status: t.status, github_issue_number: t.github_issue_number, repo: one(t.repos)?.full_name ?? "" })),
    claims: (claims ?? []).map((c) => ({ status: c.status, task: one(c.tasks) })),
    tokens: tokens ?? [],
    mergedCount: operator?.merged_count ?? 0,
    installUrl: appInstallUrl(),
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "",
  };

  return <DashboardView d={data} />;
}
