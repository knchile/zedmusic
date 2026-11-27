import { bigserial, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./auth";

/**
 * Append-only audit log of security-relevant and administrative actions.
 * Application code only ever INSERTs here.
 */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    actorId: text().references(() => users.id, { onDelete: "set null" }),
    /** e.g. "user.role_changed", "track.approved", "chart.published" */
    action: text().notNull(),
    entityType: text(),
    entityId: text(),
    metadata: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    ipHash: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.actorId, t.createdAt), index().on(t.entityType, t.entityId), index().on(t.action, t.createdAt)],
);

/** Key/value platform settings editable by admins (e.g. upload limits, featured content). */
export const platformSettings = pgTable("platform_settings", {
  key: text().primaryKey(),
  value: jsonb().notNull(),
  updatedById: text().references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
