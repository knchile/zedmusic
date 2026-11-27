import { describe, expect, it } from "vitest";
import { LIMITS, isSha256Hex, normaliseMime, objectKey, validateUpload } from "./policy";

describe("upload policy", () => {
  it("accepts supported audio and infers MIME from extension when the browser omits it", () => {
    expect(validateUpload("audio", { filename: "song.mp3", mimeType: "audio/mpeg", size: 5_000_000 })).toEqual({ ok: true, mimeType: "audio/mpeg", ext: "mp3" });
    expect(validateUpload("audio", { filename: "Song.FLAC", mimeType: "", size: 5_000_000 })).toMatchObject({ ok: true, mimeType: "audio/flac" });
    expect(normaliseMime("x.m4a", "application/octet-stream")).toBe("audio/mp4");
  });

  it("rejects unsupported types, empty, too small and too large files", () => {
    expect(validateUpload("audio", { filename: "a.exe", mimeType: "application/x-msdownload", size: 1000 }).ok).toBe(false);
    expect(validateUpload("audio", { filename: "a.mp3", size: 0 }).ok).toBe(false);
    expect(validateUpload("audio", { filename: "a.mp3", size: 100 }).ok).toBe(false);
    expect(validateUpload("audio", { filename: "a.wav", size: LIMITS.audioMaxBytes + 1 }).ok).toBe(false);
    expect(validateUpload("artwork", { filename: "a.gif", mimeType: "image/gif", size: 1000 }).ok).toBe(false);
    expect(validateUpload("avatar", { filename: "a.png", size: LIMITS.imageMaxBytes + 1 }).ok).toBe(false);
  });

  it("does not accept an audio file as an image or vice versa", () => {
    expect(validateUpload("artwork", { filename: "a.mp3", mimeType: "audio/mpeg", size: 5000 }).ok).toBe(false);
    expect(validateUpload("audio", { filename: "a.jpg", mimeType: "image/jpeg", size: 50_000 }).ok).toBe(false);
  });

  it("builds keys from server ids only (no user-controlled path segments)", () => {
    expect(objectKey("audio", "artist-1", "upload-1", "mp3")).toBe("tracks/artist-1/upload-1.mp3");
    expect(objectKey("avatar", "a", "u", "jpg")).toBe("avatars/a/u.jpg");
  });

  it("validates SHA-256 hex strings", () => {
    expect(isSha256Hex("a".repeat(64))).toBe(true);
    expect(isSha256Hex("A".repeat(64))).toBe(false);
    expect(isSha256Hex("abc")).toBe(false);
    expect(isSha256Hex(null)).toBe(false);
  });
});
