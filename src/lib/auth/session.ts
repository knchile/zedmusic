import "server-only";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { getDb, schema } from "@/db";
import { getAuth } from "@/lib/auth";
import { isConfigured } from "@/lib/env";
import {
  type Actor,
  type ArtistAccess,
  type ArtistAction,
  type PlatformAction,
  type UserRole,
  can,
  canOnArtist,
  isActive,
} from "./permissions";

export type CurrentUser = Actor & { name: string; email: string; image: string | null };

/**
 * Data Access Layer entry point: the signed-in user for this request, or null.
 * Deduplicated per request with React `cache`. Must be called inside a Suspense
 * boundary (it reads request headers).
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  if (!isConfigured("auth")) return null;
  // Session validation compares expiry against the clock, so mark this read as
  // request-time explicitly (Cache Components forbids clock reads while prerendering).
  const requestHeaders = await headers();
  await connection();
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session) return null;
  const u = session.user as typeof session.user & { role?: string; status?: string };
  const user: CurrentUser = {
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image ?? null,
    emailVerified: u.emailVerified,
    role: (u.role ?? "listener") as UserRole,
    status: (u.status ?? "active") as CurrentUser["status"],
  };
  return isActive(user) ? user : null;
});

/** Redirects to sign-in when signed out. */
export async function requireUser(returnTo?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(returnTo ? `/sign-in?next=${encodeURIComponent(returnTo)}` : "/sign-in");
  return user;
}

/**
 * Pages only. Renders 404 when the user lacks the permission, so restricted areas
 * (e.g. /admin) don't reveal that they exist.
 */
export async function requirePermission(action: PlatformAction, returnTo?: string): Promise<CurrentUser> {
  const user = await requireUser(returnTo);
  if (!can(user, action)) notFound();
  return user;
}

export async function requireAdmin(returnTo?: string) {
  return requirePermission("admin:access", returnTo);
}

/** Load the actor's active memberships relevant to one artist. */
export async function getArtistAccess(userId: string, artistId: string): Promise<ArtistAccess> {
  const db = getDb();
  const [member] = await db
    .select({ role: schema.artistMembers.role })
    .from(schema.artistMembers)
    .where(
      and(
        eq(schema.artistMembers.artistId, artistId),
        eq(schema.artistMembers.userId, userId),
        eq(schema.artistMembers.status, "active"),
      ),
    )
    .limit(1);

  const [label] = await db
    .select({ role: schema.labelMembers.role })
    .from(schema.artists)
    .innerJoin(schema.labelMembers, eq(schema.labelMembers.labelId, schema.artists.labelId))
    .where(
      and(
        eq(schema.artists.id, artistId),
        eq(schema.labelMembers.userId, userId),
        eq(schema.labelMembers.status, "active"),
      ),
    )
    .limit(1);

  return { memberRole: member?.role ?? null, labelRole: label?.role ?? null };
}

export type AuthzResult = { ok: true; user: CurrentUser } | { ok: false; status: 401 | 403 };

/** For API routes and server actions: returns a result instead of throwing. */
export async function authorizeArtist(artistId: string, action: ArtistAction): Promise<AuthzResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, status: 401 };
  const access = user.role === "admin" ? {} : await getArtistAccess(user.id, artistId);
  if (!canOnArtist(user, action, access)) return { ok: false, status: 403 };
  return { ok: true, user };
}

/** For pages: redirects to sign-in when signed out, 404 when the user has no access. */
export async function requireArtistPermission(artistId: string, action: ArtistAction): Promise<CurrentUser> {
  const result = await authorizeArtist(artistId, action);
  if (!result.ok) {
    if (result.status === 401) redirect("/sign-in");
    notFound();
  }
  return result.user;
}

export async function authorize(action: PlatformAction): Promise<AuthzResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, status: 401 };
  return can(user, action) ? { ok: true, user } : { ok: false, status: 403 };
}
