import { describe, expect, it } from "vitest";
import { ServiceUnavailableError, assertConfigured, getEnv, isConfigured, missingFor, serviceStatus } from "./env";

describe("env", () => {
  it("parses an empty environment with safe defaults", () => {
    const env = getEnv({});
    expect(env.NODE_ENV).toBe("development");
    expect(env.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
    expect(env.ALLOW_DEMO_DATA).toBe(false);
    expect(Object.values(serviceStatus(env)).every((v) => v === false)).toBe(true);
  });

  it("treats empty strings as missing", () => {
    const env = getEnv({ DATABASE_URL: "", BETTER_AUTH_SECRET: "  " });
    expect(isConfigured("database", env)).toBe(false);
    expect(missingFor("auth", env)).toEqual(["DATABASE_URL", "BETTER_AUTH_SECRET"]);
  });

  it("detects configured services", () => {
    const env = getEnv({ DATABASE_URL: "postgres://x", BETTER_AUTH_SECRET: "s", RESEND_API_KEY: "re_x" });
    expect(isConfigured("auth", env)).toBe(true);
    expect(isConfigured("email", env)).toBe(true);
    expect(isConfigured("storage", env)).toBe(false);
  });

  it("throws a typed error naming missing variables (never values)", () => {
    const env = getEnv({ S3_ENDPOINT: "https://example" });
    expect(() => assertConfigured("storage", env)).toThrow(ServiceUnavailableError);
    try {
      assertConfigured("storage", env);
    } catch (e) {
      expect((e as ServiceUnavailableError).missing).toContain("S3_ACCESS_KEY_ID");
      expect((e as Error).message).not.toContain("https://example");
    }
  });

  it("rejects malformed values with a readable message", () => {
    expect(() => getEnv({ NEXT_PUBLIC_APP_URL: "not a url" })).toThrow(/NEXT_PUBLIC_APP_URL/);
  });
});
