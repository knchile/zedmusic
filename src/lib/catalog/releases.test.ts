import { describe, expect, it } from "vitest";
import { isEditable, submissionProblems } from "./releases";

describe("release submission rules", () => {
  const ok = { type: "single" as const, artworkKey: "artwork/a/b.jpg", releaseDate: "2026-11-20" };
  it("allows a complete single", () => {
    expect(submissionProblems(ok, 1)).toEqual([]);
  });
  it("requires artwork, a date and tracks", () => {
    expect(submissionProblems({ ...ok, artworkKey: null, releaseDate: null }, 0)).toHaveLength(3);
  });
  it("enforces EP and album sizes", () => {
    expect(submissionProblems({ ...ok, type: "ep" }, 1)).toContain("An EP needs at least 2 tracks.");
    expect(submissionProblems({ ...ok, type: "album" }, 4)).toContain("An album needs at least 5 tracks.");
    expect(submissionProblems({ ...ok, type: "single" }, 4)).toContain("Too many tracks for a single.");
  });
  it("only drafts and rejected releases are editable", () => {
    expect(isEditable("draft")).toBe(true);
    expect(isEditable("rejected")).toBe(true);
    expect(isEditable("pending_review")).toBe(false);
    expect(isEditable("published")).toBe(false);
  });
});
