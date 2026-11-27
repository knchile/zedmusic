import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";
import { testDb } from "./helpers";

// Capture outgoing emails instead of sending them.
const sent: { to: string; kind: string; url?: string }[] = [];
vi.mock("@/lib/email", () => ({
  sendEmail: async (to: string, t: { kind: string; url?: string }) => {
    sent.push({ to, kind: t.kind, url: t.url });
    return { delivered: true };
  },
}));

const { db, pool } = testDb();
let getAuth: typeof import("@/lib/auth").getAuth;

beforeAll(async () => {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.BETTER_AUTH_SECRET = "test-secret-test-secret-test-secret-123";
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  ({ getAuth } = await import("@/lib/auth"));
});

afterAll(async () => {
  await pool.end();
  const { getDb } = await import("@/db");
  await getDb().$client.end();
});

const email = `listener-${Date.now()}@example.com`;
const password = "correct-horse-battery";

describe("email/password authentication", () => {
  it("signs up a listener and sends a verification email", async () => {
    const res = await getAuth().api.signUpEmail({ body: { name: "Listener", email, password } });
    expect(res.user.email).toBe(email);
    const user = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
    expect(user?.role).toBe("listener");
    expect(user?.emailVerified).toBe(false);
    expect(sent.find((m) => m.to === email && m.kind === "verify-email")?.url).toMatch(/verify-email\?token=/);
  });

  it("stores only a password hash", async () => {
    const user = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
    const account = await db.query.accounts.findFirst({ where: eq(schema.accounts.userId, user!.id) });
    expect(account?.password).toBeTruthy();
    expect(account?.password).not.toContain(password);
  });

  it("ignores attempts to self-assign the admin role at sign-up", async () => {
    const evil = `evil-${Date.now()}@example.com`;
    await getAuth()
      .api.signUpEmail({ body: { name: "Evil", email: evil, password, role: "admin" } as never })
      .catch(() => undefined);
    const user = await db.query.users.findFirst({ where: eq(schema.users.email, evil) });
    expect(user?.role ?? "listener").not.toBe("admin");
  });

  it("refuses sign-in until the email is verified", async () => {
    await expect(getAuth().api.signInEmail({ body: { email, password } })).rejects.toMatchObject({ statusCode: 403 });
  });

  it("verifies the email from the emailed token and then allows sign-in", async () => {
    const link = sent.filter((m) => m.to === email && m.kind === "verify-email").at(-1)!.url!;
    const token = new URL(link).searchParams.get("token")!;
    await getAuth().api.verifyEmail({ query: { token } });
    const user = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
    expect(user?.emailVerified).toBe(true);

    const res = await getAuth().api.signInEmail({ body: { email, password } });
    expect(res.token).toBeTruthy();
  });

  it("rejects a wrong password", async () => {
    await expect(getAuth().api.signInEmail({ body: { email, password: "wrong-password" } })).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it("blocks suspended accounts from signing in", async () => {
    await db.update(schema.users).set({ status: "suspended" }).where(eq(schema.users.email, email));
    await expect(getAuth().api.signInEmail({ body: { email, password } })).rejects.toBeTruthy();
    await db.update(schema.users).set({ status: "active" }).where(eq(schema.users.email, email));
  });

  it("resets a password via the emailed token and revokes existing sessions", async () => {
    await getAuth().api.requestPasswordReset({ body: { email, redirectTo: "/reset-password" } });
    const link = sent.filter((m) => m.to === email && m.kind === "reset-password").at(-1)!.url!;
    // Better Auth emails a callback URL: /api/auth/reset-password/<token>?callbackURL=...
    const token = new URL(link).pathname.split("/").pop()!;
    const newPassword = "a-brand-new-password";
    await getAuth().api.resetPassword({ body: { token, newPassword } });

    const user = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
    const sessions = await db.select().from(schema.sessions).where(eq(schema.sessions.userId, user!.id));
    expect(sessions).toHaveLength(0);
    await expect(getAuth().api.signInEmail({ body: { email, password } })).rejects.toBeTruthy();
    expect((await getAuth().api.signInEmail({ body: { email, password: newPassword } })).token).toBeTruthy();
    expect(sent.some((m) => m.to === email && m.kind === "password-changed")).toBe(true);
  });
});
