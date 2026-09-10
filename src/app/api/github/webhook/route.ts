import { NextResponse, after, type NextRequest } from "next/server";
import { getGitHubApp } from "@/lib/github/app";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { must } from "@/lib/db";
import { processDelivery } from "@/lib/webhooks";
import { retryFailedDeliveries } from "@/lib/sweep";

// The gate makes several GitHub calls; give it room beyond the default function limit.
export const maxDuration = 60;

export const POST = async (request: NextRequest) => {
  const payload = await request.text();
  const signature = request.headers.get("x-hub-signature-256") ?? "";
  const event = request.headers.get("x-github-event") ?? "";
  const deliveryId = request.headers.get("x-github-delivery") ?? "";

  const valid = await getGitHubApp().webhooks.verify(payload, signature);
  if (!valid) return NextResponse.json({ error: "bad signature" }, { status: 401 });
  if (!deliveryId) return NextResponse.json({ error: "missing delivery id" }, { status: 400 });

  const body = JSON.parse(payload);
  const db = createServiceRoleClient();

  // Record first: a redelivery of something already done is answered without doing it twice.
  const { data: inserted } = must(
    await db
      .from("webhook_deliveries")
      .upsert({ id: deliveryId, event, action: body.action ?? null, payload: body }, { onConflict: "id", ignoreDuplicates: true })
      .select("id"),
  );
  if (!inserted?.length) {
    const { data: existing } = await db.from("webhook_deliveries").select("status").eq("id", deliveryId).single();
    if (existing?.status === "done") return NextResponse.json({ ok: true, duplicate: true });
  }

  try {
    await processDelivery(event, body);
    must(await db.from("webhook_deliveries").update({ status: "done", error: null, processed_at: new Date().toISOString() }).eq("id", deliveryId));
    // Earlier failures get another go right away, not only at the daily sweep.
    after(() => retryFailedDeliveries(db).catch((e) => console.error("retry after delivery:", e)));
    return NextResponse.json({ ok: true });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error(`delivery ${deliveryId} (${event}.${body.action}) failed: ${error}`);
    const { data: row } = await db.from("webhook_deliveries").select("attempts").eq("id", deliveryId).single();
    await db
      .from("webhook_deliveries")
      .update({ status: "failed", error, attempts: (row?.attempts ?? 0) + 1, processed_at: new Date().toISOString() })
      .eq("id", deliveryId);
    return NextResponse.json({ error }, { status: 500 });
  }
};
