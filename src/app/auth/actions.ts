"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const signInWithGitHub = async (next = "/dashboard") => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error || !data.url) redirect("/?error=signin");
  redirect(data.url);
};

export const signOut = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
};
