import { describe, expect, it } from "vitest";
import { formatDuration, safeRedirectPath, slugify } from "./utils";

describe("slugify", () => {
  it("creates URL-safe slugs", () => {
    expect(slugify("Chef 187")).toBe("chef-187");
    expect(slugify("  Mampi & Friends!! ")).toBe("mampi-and-friends");
    expect(slugify("Café Mwansa")).toBe("cafe-mwansa");
    expect(slugify("---")).toBe("");
  });
  it("respects max length without trailing dashes", () => {
    expect(slugify("a ".repeat(100), 10)).toBe("a-a-a-a-a");
  });
});

describe("safeRedirectPath", () => {
  it("allows same-origin relative paths", () => {
    expect(safeRedirectPath("/account")).toBe("/account");
    expect(safeRedirectPath("/charts?x=1")).toBe("/charts?x=1");
  });
  it("blocks open redirects", () => {
    expect(safeRedirectPath("https://evil.com")).toBe("/");
    expect(safeRedirectPath("//evil.com")).toBe("/");
    expect(safeRedirectPath("/\\evil.com")).toBe("/");
    expect(safeRedirectPath("javascript:alert(1)")).toBe("/");
    expect(safeRedirectPath(null, "/home")).toBe("/home");
  });
});

describe("formatDuration", () => {
  it("formats milliseconds", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(65_000)).toBe("1:05");
    expect(formatDuration(3_725_000)).toBe("1:02:05");
    expect(formatDuration(-5)).toBe("0:00");
    expect(formatDuration(Number.NaN)).toBe("0:00");
  });
});
