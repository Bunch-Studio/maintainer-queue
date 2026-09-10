import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Unauthenticated liveness probe: one cheap read on repos tells us the database is reachable.
export const GET = async () => {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("repos").select("id", { count: "exact", head: true }).limit(1);
    if (error) throw error;
    return NextResponse.json({ ok: true, db: true });
  } catch {
    return NextResponse.json({ ok: false, db: false }, { status: 503 });
  }
};
