import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signInWithGitHub, signOut } from "@/app/auth/actions";

const name = process.env.NEXT_PUBLIC_SITE_NAME ?? "Maintainer Queue";

export const Nav = async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const login = (user?.user_metadata?.user_name as string | undefined) ?? user?.email;

  return (
    <header className="border-b border-hairline">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between gap-6">
        <Link href="/" className="font-display font-bold text-lg tracking-tight">{name}</Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/" className="text-ink-2 hover:text-ink">Board</Link>
          <Link href="/how" className="text-ink-2 hover:text-ink">How it works</Link>
          {user ? (
            <>
              <Link href="/dashboard" className="text-ink-2 hover:text-ink">Dashboard</Link>
              <form action={signOut}>
                <button className="font-mono text-xs text-ink-2 hover:text-ink" type="submit">{login} · sign out</button>
              </form>
            </>
          ) : (
            <form action={async () => { "use server"; await signInWithGitHub("/dashboard"); }}>
              <button
                type="submit"
                className="h-9 px-3 rounded-md bg-ink text-ground text-sm font-medium hover:opacity-90 active:opacity-80"
              >
                Sign in with GitHub
              </button>
            </form>
          )}
        </nav>
      </div>
    </header>
  );
};
