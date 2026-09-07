import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const PREFIX = "mq_";

export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

// Returns the plaintext once; only the hash is stored.
export const mintAgentToken = async (operatorId: string, label = "default") => {
  const token = PREFIX + randomBytes(24).toString("base64url");
  const db = createServiceRoleClient();
  const { error } = await db
    .from("agent_tokens")
    .insert({ operator_id: operatorId, token_hash: hashToken(token), label });
  if (error) throw new Error(error.message);
  return token;
};

export const resolveAgentToken = async (authorization: string | null) => {
  const token = authorization?.replace(/^Bearer\s+/i, "").trim();
  if (!token?.startsWith(PREFIX)) return null;
  const db = createServiceRoleClient();
  const { data } = await db
    .from("agent_tokens")
    .select("id, operator_id, revoked_at, operators ( login )")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (!data || data.revoked_at) return null;
  await db.from("agent_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  const operator = Array.isArray(data.operators) ? data.operators[0] : data.operators;
  return { operatorId: data.operator_id as string, login: (operator?.login as string) ?? "unknown" };
};
