/**
 * Grant or revoke the admin role. This is the ONLY way to create an administrator,
 * so the first admin is bootstrapped by someone with database access.
 *
 *   npm run admin:grant -- someone@example.com
 *   npm run admin:grant -- someone@example.com --revoke
 *
 * The user must already have an account with a confirmed email. Every change is
 * written to audit_logs.
 */
import { eq } from "drizzle-orm";
import { scriptDb } from "./lib/db";

async function main() {
  const args = process.argv.slice(2);
  const email = args.find((a) => !a.startsWith("--"))?.trim().toLowerCase();
  const revoke = args.includes("--revoke");
  if (!email) {
    console.error("Usage: npm run admin:grant -- <email> [--revoke]");
    process.exit(1);
  }

  const { db, pool, schema } = scriptDb();
  try {
    await db.transaction(async (tx) => {
      const user = await tx.query.users.findFirst({ where: eq(schema.users.email, email) });
      if (!user) throw new Error(`No account found for ${email}. Ask them to sign up first.`);
      if (!revoke && !user.emailVerified) throw new Error(`${email} has not confirmed their email address yet.`);

      const newRole = revoke ? "listener" : "admin";
      if (user.role === newRole) {
        console.log(`${email} already has role "${newRole}". No change.`);
        return;
      }
      await tx.update(schema.users).set({ role: newRole, updatedAt: new Date() }).where(eq(schema.users.id, user.id));
      // Force re-authentication so the new role takes effect cleanly.
      await tx.delete(schema.sessions).where(eq(schema.sessions.userId, user.id));
      await tx.insert(schema.auditLogs).values({
        actorId: null,
        action: revoke ? "user.admin_revoked" : "user.admin_granted",
        entityType: "user",
        entityId: user.id,
        metadata: { via: "cli", previousRole: user.role, newRole, osUser: process.env.USER ?? null },
      });
      console.log(`${email}: role ${user.role} → ${newRole}. Their sessions were signed out.`);
    });
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
