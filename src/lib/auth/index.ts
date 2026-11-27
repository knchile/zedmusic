import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { getDb, schema } from "@/db";
import { getEnv, isConfigured, ServiceUnavailableError } from "@/lib/env";
import { sendEmail } from "@/lib/email";

function createAuth() {
  const env = getEnv();
  if (!env.BETTER_AUTH_SECRET) throw new ServiceUnavailableError("auth", ["BETTER_AUTH_SECRET"]);
  const db = getDb();
  const isProd = env.NODE_ENV === "production";

  const socialProviders = isConfigured("google-auth", env)
    ? { google: { clientId: env.GOOGLE_CLIENT_ID!, clientSecret: env.GOOGLE_CLIENT_SECRET! } }
    : {};

  return betterAuth({
    appName: "Zed Music Online",
    baseURL: env.NEXT_PUBLIC_APP_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [
      env.NEXT_PUBLIC_APP_URL,
      // Accept both apex and www so a misconfigured redirect never breaks sign-in.
      ...(env.NEXT_PUBLIC_APP_URL.includes("://www.")
        ? [env.NEXT_PUBLIC_APP_URL.replace("://www.", "://")]
        : []),
    ],
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
        rateLimit: schema.rateLimits,
      },
    }),

    user: {
      additionalFields: {
        // `input: false` — users can never set these themselves during sign-up or profile updates.
        role: { type: "string", required: false, defaultValue: "listener", input: false },
        status: { type: "string", required: false, defaultValue: "active", input: false },
      },
    },

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 60 * 60,
      sendResetPassword: async ({ user, url }) => {
        await sendEmail(user.email, { kind: "reset-password", name: user.name, url });
      },
      onPasswordReset: async ({ user }) => {
        await sendEmail(user.email, { kind: "password-changed", name: user.name });
      },
    },

    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60,
      sendVerificationEmail: async ({ user, url }) => {
        await sendEmail(user.email, { kind: "verify-email", name: user.name, url });
      },
    },

    socialProviders,

    account: {
      accountLinking: { enabled: true, trustedProviders: ["google"] },
    },

    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24, // refresh expiry daily on activity
      // Cookie cache is intentionally off: suspensions and role changes must take effect immediately.
    },

    rateLimit: {
      enabled: isProd,
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60 * 10, max: 5 },
        "/request-password-reset": { window: 60 * 10, max: 3 },
        "/send-verification-email": { window: 60 * 10, max: 3 },
      },
    },

    advanced: {
      useSecureCookies: isProd,
      ipAddress: {
        // Vercel sets these and overwrites client-supplied values.
        ipAddressHeaders: ["x-vercel-forwarded-for", "x-real-ip", "x-forwarded-for"],
      },
    },

    databaseHooks: {
      session: {
        create: {
          // Suspended or deleted accounts cannot start new sessions.
          before: async (session) => {
            const user = await db.query.users.findFirst({
              columns: { status: true },
              where: (u, { eq }) => eq(u.id, session.userId),
            });
            if (user && user.status !== "active") return false;
            return { data: session };
          },
        },
      },
    },

    // Must be last: lets server actions set auth cookies.
    plugins: [nextCookies()],
  });
}

type Auth = ReturnType<typeof createAuth>;
let instance: Auth | undefined;

/** Lazily constructed so builds without credentials don't fail at import time. */
export function getAuth(): Auth {
  instance ??= createAuth();
  return instance;
}

export type AuthSession = Auth["$Infer"]["Session"];
