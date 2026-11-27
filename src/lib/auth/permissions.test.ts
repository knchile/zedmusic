import { describe, expect, it } from "vitest";
import { type Actor, type ArtistAction, assignableRoles, can, canOnArtist, isAdmin } from "./permissions";

const actor = (over: Partial<Actor> = {}): Actor => ({
  id: "u1",
  role: "listener",
  status: "active",
  emailVerified: true,
  ...over,
});

const allArtistActions: ArtistAction[] = [
  "artist:view-analytics",
  "artist:edit-profile",
  "artist:upload",
  "artist:submit-for-review",
  "artist:manage-members",
  "artist:connect-external",
  "artist:import-reports",
];

describe("canOnArtist", () => {
  it("denies everything without a membership — even for artist accounts", () => {
    for (const role of ["listener", "artist", "manager", "label"] as const) {
      for (const action of allArtistActions) {
        expect(canOnArtist(actor({ role }), action, {})).toBe(false);
      }
    }
  });

  it("an artist cannot view another artist's analytics", () => {
    // Access is evaluated per artist: membership on artist A gives nothing on artist B.
    const artistUser = actor({ role: "artist" });
    expect(canOnArtist(artistUser, "artist:view-analytics", { memberRole: "owner" })).toBe(true);
    expect(canOnArtist(artistUser, "artist:view-analytics", { memberRole: null, labelRole: null })).toBe(false);
  });

  it("owners can do everything on their artist", () => {
    for (const action of allArtistActions) {
      expect(canOnArtist(actor({ role: "artist" }), action, { memberRole: "owner" })).toBe(true);
    }
  });

  it("only owners manage members", () => {
    for (const memberRole of ["manager", "editor", "analyst"] as const) {
      expect(canOnArtist(actor(), "artist:manage-members", { memberRole })).toBe(false);
    }
  });

  it("analysts can only view analytics", () => {
    for (const action of allArtistActions) {
      expect(canOnArtist(actor(), action, { memberRole: "analyst" })).toBe(action === "artist:view-analytics");
    }
  });

  it("editors cannot see analytics", () => {
    expect(canOnArtist(actor(), "artist:view-analytics", { memberRole: "editor" })).toBe(false);
    expect(canOnArtist(actor(), "artist:upload", { memberRole: "editor" })).toBe(true);
  });

  it("label roles grant access to the label's artists", () => {
    expect(canOnArtist(actor({ role: "label" }), "artist:view-analytics", { labelRole: "analyst" })).toBe(true);
    expect(canOnArtist(actor({ role: "label" }), "artist:upload", { labelRole: "analyst" })).toBe(false);
    expect(canOnArtist(actor({ role: "label" }), "artist:manage-members", { labelRole: "owner" })).toBe(false);
  });

  it("requires a verified email for non-admins", () => {
    expect(canOnArtist(actor({ emailVerified: false }), "artist:view-analytics", { memberRole: "owner" })).toBe(false);
  });

  it("suspended or deleted accounts get nothing, including admins", () => {
    expect(canOnArtist(actor({ status: "suspended" }), "artist:upload", { memberRole: "owner" })).toBe(false);
    expect(canOnArtist(actor({ role: "admin", status: "suspended" }), "artist:upload", {})).toBe(false);
    expect(canOnArtist(actor({ role: "admin", status: "deleted" }), "artist:upload", {})).toBe(false);
  });

  it("active admins can act on any artist", () => {
    for (const action of allArtistActions) expect(canOnArtist(actor({ role: "admin" }), action, {})).toBe(true);
  });

  it("anonymous users get nothing", () => {
    expect(canOnArtist(null, "artist:view-analytics", { memberRole: "owner" })).toBe(false);
  });
});

describe("can (platform actions)", () => {
  it("restricts admin actions to admins", () => {
    for (const role of ["listener", "artist", "manager", "label"] as const) {
      expect(can(actor({ role }), "admin:access")).toBe(false);
      expect(can(actor({ role }), "admin:manage-charts")).toBe(false);
    }
    expect(can(actor({ role: "admin" }), "admin:access")).toBe(true);
    expect(isAdmin(actor({ role: "admin" }))).toBe(true);
    expect(isAdmin(actor({ role: "admin", status: "suspended" }))).toBe(false);
  });

  it("lets any active user like/follow/playlist, but not anonymous or suspended users", () => {
    expect(can(actor(), "listener:like")).toBe(true);
    expect(can(null, "listener:like")).toBe(false);
    expect(can(actor({ status: "suspended" }), "listener:follow")).toBe(false);
  });

  it("requires a confirmed email to register as an artist", () => {
    expect(can(actor({ emailVerified: false }), "artist:register")).toBe(false);
    expect(can(actor(), "artist:register")).toBe(true);
  });
});

describe("assignableRoles", () => {
  it("never lets anyone assign admin through the app", () => {
    expect(assignableRoles(actor({ role: "admin" }))).not.toContain("admin");
    expect(assignableRoles(actor())).toEqual([]);
  });
});
