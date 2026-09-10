import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { must } from "@/lib/db";
import { processDelivery } from "@/lib/webhooks";

type Db = ReturnType<typeof createServiceRoleClient>;

const MAX_ATTEMPTS = 5;

// Claims past expires_at go back to the board.
export const releaseExpiredClaims = async (db: Db) => {
  const { data: expired } = must(
    await db.from("claims").update({ status: "expired" }).eq("status", "active").lt("expires_at", new Date().toISOString()).select("task_id"),
  );
  const taskIds = (expired ?? []).map((c) => c.task_id);
  if (taskIds.length) must(await db.from("tasks").update({ status: "open" }).in("id", taskIds).eq("status", "claimed"));
  return taskIds.length;
};

// Deliveries that failed get another go, oldest first, until they run out of attempts.
export const retryFailedDeliveries = async (db: Db) => {
  const { data: failed } = await db
    .from("webhook_deliveries")
    .select("id, event, payload, attempts")
    .eq("status", "failed")
    .lt("attempts", MAX_ATTEMPTS)
    .order("created_at")
    .limit(20);
  let done = 0;
  for (const d of failed ?? []) {
    try {
      await processDelivery(d.event, d.payload);
      must(await db.from("webhook_deliveries").update({ status: "done", error: null, attempts: d.attempts + 1, processed_at: new Date().toISOString() }).eq("id", d.id));
      done++;
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      console.error(`delivery ${d.id} retry failed: ${error}`);
      await db.from("webhook_deliveries").update({ attempts: d.attempts + 1, error, processed_at: new Date().toISOString() }).eq("id", d.id);
    }
  }
  return { retried: (failed ?? []).length, done };
};

export const sweep = async () => {
  const db = createServiceRoleClient();
  const released = await releaseExpiredClaims(db);
  const deliveries = await retryFailedDeliveries(db);
  return { released, ...deliveries };
};
