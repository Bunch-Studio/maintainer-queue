import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Supabase Auth redirects here after GitHub sign-in with a PKCE code.
export const GET = async (request: NextRequest) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, process.env.NEXT_PUBLIC_SITE_URL));
    }
  }
  return NextResponse.redirect(new URL("/?error=signin", process.env.NEXT_PUBLIC_SITE_URL));
};
