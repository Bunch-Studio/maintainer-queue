import { NextResponse, type NextRequest } from "next/server";
import { getGitHubApp, getInstallationOctokit } from "@/lib/github/app";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

// GitHub sends the user here after installing the App. The webhook also records
// repos, but this path makes the dashboard correct immediately.
export const GET = async (request: NextRequest) => {
  const installationId = Number(new URL(request.url).searchParams.get("installation_id"));
  if (!installationId) return NextResponse.redirect(new URL("/dashboard", process.env.NEXT_PUBLIC_SITE_URL));

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  await getGitHubApp().octokit.request("GET /app/installations/{installation_id}", { installation_id: installationId });
  const octokit = await getInstallationOctokit(installationId);
  const { data } = await octokit.request("GET /installation/repositories", { per_page: 100 });

  const db = createServiceRoleClient();
  await db.from("repos").upsert(
    data.repositories.map((r) => ({
      github_repo_id: r.id,
      installation_id: installationId,
      owner: r.owner.login,
      name: r.name,
      full_name: r.full_name,
      default_branch: r.default_branch,
      is_private: r.private,
      installed_by: user?.id ?? null,
      active: true,
    })),
    { onConflict: "github_repo_id" },
  );

  return NextResponse.redirect(new URL("/dashboard", process.env.NEXT_PUBLIC_SITE_URL));
};
