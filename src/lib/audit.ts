import "server-only";
import { getDb, schema } from "@/db";
import { getEnv } from "@/lib/env";
import { hmacId } from "@/lib/security/hash";

export type AuditEntry = {
  actorId: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
};

/**
 * Append an audit record. Pass a transaction (`tx`) so the log is written
 * atomically with the change it describes.
 */
export async function audit(entry: AuditEntry, tx: Pick<ReturnType<typeof getDb>, "insert"> = getDb()) {
  const secret = getEnv().ANALYTICS_HASH_SECRET;
  await tx.insert(schema.auditLogs).values({
    actorId: entry.actorId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    metadata: entry.metadata ?? {},
    ipHash: entry.ip && secret ? hmacId(entry.ip, secret) : null,
  });
}
