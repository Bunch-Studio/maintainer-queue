import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signInWithGitHub, signOut } from "@/app/auth/actions";
import { Logo } from "@/components/logo";

const name = process.env.NEXT_PUBLIC_SITE_NAME ?? "Maintainer Queue";

export const Nav = async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const login = (user?.user_metadata?.user_name as string | undefined) ?? user?.email;

  return (
    <header className="sticky top-0 z-20 border-b border-hairline bg-ground/80 backdrop-blur-md supports-[backdrop-filter]:bg-ground/70">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 font-display font-bold text-lg tracking-tight whitespace-nowrap shrink-0">
          <Logo />
          {name}
        </Link>
        <nav className="flex items-center gap-4 sm:gap-6 text-sm whitespace-nowrap">
          <Link href="/board" className="text-ink-2 hover:text-ink">Board</Link>
          <Link href="/how" className="text-ink-2 hover:text-ink hidden sm:inline">How it works</Link>
          {user ? (
            <>
              <Link href="/dashboard" className="text-ink-2 hover:text-ink">Dashboard</Link>
              <form action={signOut}>
                <button className="font-mono text-xs text-ink-2 hover:text-ink" type="submit">
                  <span className="hidden sm:inline">{login} · </span>sign out
                </button>
              </form>
            </>
          ) : (
            <form action={async () => { "use server"; await signInWithGitHub("/dashboard"); }}>
              <button
                type="submit"
                className="btn h-9 px-3 rounded-md bg-ink text-ground text-sm font-medium hover:opacity-90"
              >
                <span className="sm:hidden">Sign in</span>
                <span className="hidden sm:inline">Sign in with GitHub</span>
              </button>
            </form>
          )}
        </nav>
      </div>
    </header>
  );
};
