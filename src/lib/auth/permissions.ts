/**
 * Pure, framework-free authorisation rules. Every access decision in the app goes
 * through these functions so they can be unit-tested exhaustively.
 *
 * Model:
 * - `user.role` is the account type (listener, artist, manager, label, admin).
 * - Access to a specific artist is granted ONLY by an active row in `artist_members`
 *   (or `label_members` for the artist's label) — never by account type alone.
 *   An "artist" account therefore cannot see another artist's analytics.
 * - Admins can do everything; every admin action is audit-logged.
 */

export const USER_ROLES = ["listener", "artist", "manager", "label", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export type ArtistMemberRole = "owner" | "manager" | "editor" | "analyst";
export type LabelMemberRole = "owner" | "admin" | "analyst";

export type Actor = {
  id: string;
  role: UserRole;
  status: "active" | "suspended" | "deleted";
  emailVerified: boolean;
};

export type ArtistAccess = {
  /** Active memberships of this actor on the artist. */
  memberRole?: ArtistMemberRole | null;
  /** Active role on the artist's label, if the artist belongs to a label. */
  labelRole?: LabelMemberRole | null;
};

export type ArtistAction =
  | "artist:view-studio"
  | "artist:view-analytics"
  | "artist:edit-profile"
  | "artist:upload"
  | "artist:submit-for-review"
  | "artist:manage-members"
  | "artist:connect-external"
  | "artist:import-reports";

const artistMemberGrants: Record<ArtistMemberRole, ArtistAction[]> = {
  owner: [
    "artist:view-studio",
    "artist:view-analytics",
    "artist:edit-profile",
    "artist:upload",
    "artist:submit-for-review",
    "artist:manage-members",
    "artist:connect-external",
    "artist:import-reports",
  ],
  manager: [
    "artist:view-studio",
    "artist:view-analytics",
    "artist:edit-profile",
    "artist:upload",
    "artist:submit-for-review",
    "artist:connect-external",
    "artist:import-reports",
  ],
  editor: ["artist:view-studio", "artist:edit-profile", "artist:upload"],
  analyst: ["artist:view-studio", "artist:view-analytics"],
};

const labelMemberGrants: Record<LabelMemberRole, ArtistAction[]> = {
  owner: ["artist:view-studio", "artist:view-analytics", "artist:edit-profile", "artist:upload", "artist:submit-for-review", "artist:import-reports"],
  admin: ["artist:view-studio", "artist:view-analytics", "artist:upload", "artist:submit-for-review", "artist:import-reports"],
  analyst: ["artist:view-studio", "artist:view-analytics"],
};

export function isActive(actor: Actor | null | undefined): actor is Actor {
  return !!actor && actor.status === "active";
}

export function isAdmin(actor: Actor | null | undefined): boolean {
  return isActive(actor) && actor.role === "admin";
}

/** Can this actor perform `action` on an artist, given their memberships? */
export function canOnArtist(actor: Actor | null | undefined, action: ArtistAction, access: ArtistAccess): boolean {
  if (!isActive(actor)) return false;
  if (actor.role === "admin") return true;
  // Writes and analytics require a verified email address.
  if (!actor.emailVerified) return false;
  if (access.memberRole && artistMemberGrants[access.memberRole].includes(action)) return true;
  if (access.labelRole && labelMemberGrants[access.labelRole].includes(action)) return true;
  return false;
}

export type PlatformAction =
  | "admin:access"
  | "admin:review-music"
  | "admin:verify-artists"
  | "admin:manage-users"
  | "admin:manage-charts"
  | "admin:manage-settings"
  | "admin:review-fraud"
  | "admin:handle-copyright"
  | "listener:like"
  | "listener:follow"
  | "listener:playlist"
  | "artist:register";

/** Platform-wide permissions that don't depend on a specific resource. */
export function can(actor: Actor | null | undefined, action: PlatformAction): boolean {
  if (!isActive(actor)) return false;
  if (action.startsWith("admin:")) return actor.role === "admin";
  switch (action) {
    case "listener:like":
    case "listener:follow":
    case "listener:playlist":
      return true;
    case "artist:register":
      return actor.emailVerified;
    default:
      return false;
  }
}

/** Roles an admin may assign. Admin can only be granted via the CLI script (audit-logged). */
export function assignableRoles(actor: Actor | null | undefined): UserRole[] {
  if (!isAdmin(actor)) return [];
  return ["listener", "artist", "manager", "label"];
}
