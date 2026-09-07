import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Session refresh for signed-in pages. Webhooks and the MCP endpoint authenticate
// on their own and are excluded by the matcher.
export const proxy = async (request: NextRequest) => {
  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
  if (!hasAuthCookie || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  await supabase.auth.getUser();
  return response;
};

export const config = {
  matcher: ["/((?!api/|_next/|favicon.ico|.*\\..*).*)"],
};
