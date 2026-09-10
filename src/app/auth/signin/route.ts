import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Starts GitHub sign-in and comes back to `next`. Pages that need a session send anonymous visitors here.
export const GET = async (request: NextRequest) => {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const requested = new URL(request.url).searchParams.get("next") ?? "/dashboard";
  const next = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/dashboard";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: { redirectTo: `${site}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) return NextResponse.redirect(new URL("/board?error=signin", site));
  return NextResponse.redirect(data.url);
};
