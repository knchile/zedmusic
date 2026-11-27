import { describe, expect, it } from "vitest";
import { artistProfileSchema, isValidIsrc, normaliseIsrc, releaseSchema, splitCredits, trackSchema } from "./catalog";

const uuid = "8f14e45f-ceea-4e7a-9c1b-6f8d2f1b1e2a";

describe("catalog validation", () => {
  it("normalises and validates ISRCs", () => {
    expect(normaliseIsrc("zm-a1b-26-00001")).toBe("ZMA1B2600001");
    expect(isValidIsrc("ZM-A1B-26-00001")).toBe(true);
    expect(isValidIsrc("ZM-A1B-26-0001")).toBe(false);
    expect(trackSchema.safeParse({ title: "T", audioUploadId: uuid, isrc: "bad" }).success).toBe(false);
    expect(trackSchema.parse({ title: "T", audioUploadId: uuid, isrc: "zm-a1b-26-00001" }).isrc).toBe("ZMA1B2600001");
  });

  it("splits credit strings", () => {
    expect(splitCredits("Chef 187, Yo Maps & Macky 2")).toEqual(["Chef 187", "Yo Maps", "Macky 2"]);
    expect(splitCredits("A feat. B ft C")).toEqual(["A", "B", "C"]);
    expect(splitCredits(undefined)).toEqual([]);
  });

  it("requires https social links", () => {
    const base = { name: "Artist", social: {} };
    expect(artistProfileSchema.safeParse(base).success).toBe(true);
    expect(artistProfileSchema.safeParse({ ...base, social: { instagram: "http://instagram.com/x" } }).success).toBe(false);
    expect(artistProfileSchema.safeParse({ ...base, social: { instagram: "javascript:alert(1)" } }).success).toBe(false);
    expect(artistProfileSchema.safeParse({ ...base, social: { instagram: "https://instagram.com/x" } }).success).toBe(true);
  });

  it("validates releases", () => {
    expect(releaseSchema.safeParse({ title: "EP", type: "ep", releaseDate: "2026-02-30x" }).success).toBe(false);
    expect(releaseSchema.safeParse({ title: "EP", type: "ep", upc: "123" }).success).toBe(false);
    expect(releaseSchema.safeParse({ title: "EP", type: "ep", releaseDate: "2026-11-20", upc: "123456789012" }).success).toBe(true);
    expect(releaseSchema.safeParse({ title: "", type: "single" }).success).toBe(false);
  });
});
