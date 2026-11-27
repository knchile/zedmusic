import { describe, expect, it } from "vitest";
import { localPath, signLocal, verifyLocal } from "./local";

describe("local dev storage signatures", () => {
  const exp = Math.floor(Date.now() / 1000) + 60;

  it("verifies a valid signature and rejects tampering", () => {
    const sig = signLocal("get", "audio", "tracks/a/b.mp3", exp);
    expect(verifyLocal("get", "audio", "tracks/a/b.mp3", exp, sig)).toBe(true);
    expect(verifyLocal("get", "audio", "tracks/a/OTHER.mp3", exp, sig)).toBe(false);
    expect(verifyLocal("put", "audio", "tracks/a/b.mp3", exp, sig)).toBe(false);
    expect(verifyLocal("get", "audio", "tracks/a/b.mp3", exp + 1, sig)).toBe(false);
  });

  it("binds PUT signatures to content type and size", () => {
    const sig = signLocal("put", "media", "k.jpg", exp, "image/jpeg\n100");
    expect(verifyLocal("put", "media", "k.jpg", exp, sig, "image/jpeg\n100")).toBe(true);
    expect(verifyLocal("put", "media", "k.jpg", exp, sig, "image/jpeg\n999999")).toBe(false);
  });

  it("rejects expired signatures", () => {
    const past = Math.floor(Date.now() / 1000) - 1;
    expect(verifyLocal("get", "audio", "k", past, signLocal("get", "audio", "k", past))).toBe(false);
  });

  it("prevents path traversal outside the bucket", () => {
    expect(() => localPath("audio", "../../etc/passwd")).toThrow();
    expect(() => localPath("media", "../audio/secret.mp3")).toThrow();
    expect(localPath("audio", "tracks/a/b.mp3")).toMatch(/\.data\/storage\/audio\/tracks\/a\/b\.mp3$/);
  });
});
