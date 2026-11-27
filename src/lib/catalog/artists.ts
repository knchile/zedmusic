import "server-only";
import { and, count, eq, ilike, inArray, isNull, notExists, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { audit } from "@/lib/audit";
import type { CurrentUser } from "@/lib/auth/session";
import { slugify } from "@/lib/utils";
import type { ArtistProfileInput } from "@/lib/validation/catalog";
import { readyUploads } from "@/lib/uploads/service";

export const MAX_OWNED_ARTISTS = 5;
type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

/** Reserved so artist slugs never collide with top-level routes or look official. */
const RESERVED = new Set(["admin", "studio", "new", "search", "charts", "api", "zed-music-online", "zedmusic", "official"]);

export async function uniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const root = slugify(base) || "artist";
  const candidate = RESERVED.has(root) ? `${root}-music` : root;
  if (!(await exists(candidate))) return candidate;
  for (let i = 2; i < 50; i++) {
    const s = `${candidate}-${i}`;
    if (!(await exists(s))) return s;
  }
  return `${candidate}-${crypto.randomUUID().slice(0, 6)}`;
}

export async function listManagedArtists(userId: string) {
  return getDb()
    .select({
      id: schema.artists.id,
      slug: schema.artists.slug,
      name: schema.artists.name,
      avatarKey: schema.artists.avatarKey,
      verificationStatus: schema.artists.verificationStatus,
      role: schema.artistMembers.role,
    })
    .from(schema.artistMembers)
    .innerJoin(schema.artists, eq(schema.artists.id, schema.artistMembers.artistId))
    .where(and(eq(schema.artistMembers.userId, userId), eq(schema.artistMembers.status, "active"), eq(schema.artists.state, "active")))
    .orderBy(schema.artists.name);
}

function socialLinks(input: ArtistProfileInput) {
  return Object.fromEntries(Object.entries(input.social).filter(([, v]) => !!v)) as Record<string, string>;
}

export type CreateArtistResult = { ok: true; artistId: string; slug: string } | { ok: false; error: string };

/** Self-registration: creates the profile and makes the user its owner, atomically. */
export async function createArtistProfile(user: CurrentUser, input: ArtistProfileInput): Promise<CreateArtistResult> {
  const db = getDb();
  const [{ owned }] = await db
    .select({ owned: count() })
    .from(schema.artistMembers)
    .where(and(eq(schema.artistMembers.userId, user.id), eq(schema.artistMembers.role, "owner"), eq(schema.artistMembers.status, "active")));
  if (owned >= MAX_OWNED_ARTISTS) return { ok: false, error: `You can own up to ${MAX_OWNED_ARTISTS} artist profiles.` };

  return db.transaction(async (tx) => {
    const slug = await uniqueSlug(input.name, async (s) => !!(await tx.query.artists.findFirst({ columns: { id: true }, where: eq(schema.artists.slug, s) })));
    const [artist] = await tx
      .insert(schema.artists)
      .values({
        slug,
        name: input.name,
        bio: input.bio,
        location: input.location,
        primaryGenreId: input.primaryGenreId,
        socialLinks: socialLinks(input),
        origin: "self_registered",
      })
      .returning({ id: schema.artists.id });
    await tx.insert(schema.artistMembers).values({ artistId: artist!.id, userId: user.id, role: "owner", status: "active", grantedById: user.id });
    if (user.role === "listener") await tx.update(schema.users).set({ role: "artist" }).where(eq(schema.users.id, user.id));
    await audit({ actorId: user.id, action: "artist.created", entityType: "artist", entityId: artist!.id, metadata: { slug } }, tx);
    return { ok: true as const, artistId: artist!.id, slug };
  });
}

export async function updateArtistProfile(
  actorId: string,
  artistId: string,
  input: ArtistProfileInput,
  media: { avatarUploadId?: string; coverUploadId?: string },
) {
  const ids = [media.avatarUploadId, media.coverUploadId].filter((v): v is string => !!v);
  const uploads = await readyUploads(artistId, ids);
  const avatar = uploads.find((u) => u.id === media.avatarUploadId && u.kind === "avatar");
  const cover = uploads.find((u) => u.id === media.coverUploadId && u.kind === "cover");
  if (media.avatarUploadId && !avatar) return { ok: false as const, error: "The profile photo upload wasn't found. Please upload it again." };
  if (media.coverUploadId && !cover) return { ok: false as const, error: "The cover image upload wasn't found. Please upload it again." };

  await getDb().transaction(async (tx: Tx) => {
    await tx
      .update(schema.artists)
      .set({
        name: input.name,
        bio: input.bio ?? null,
        location: input.location ?? null,
        primaryGenreId: input.primaryGenreId ?? null,
        socialLinks: socialLinks(input),
        ...(avatar ? { avatarKey: avatar.objectKey } : {}),
        ...(cover ? { coverKey: cover.objectKey } : {}),
      })
      .where(eq(schema.artists.id, artistId));
    await audit({ actorId, action: "artist.profile_updated", entityType: "artist", entityId: artistId }, tx);
  });
  return { ok: true as const };
}

/** Platform-created profiles with no active owner — the only ones that can be claimed. */
export async function searchClaimableArtists(query: string) {
  const q = query.trim();
  if (q.length < 2) return [];
  return getDb()
    .select({ id: schema.artists.id, name: schema.artists.name, slug: schema.artists.slug, location: schema.artists.location })
    .from(schema.artists)
    .where(
      and(
        eq(schema.artists.origin, "platform_created"),
        eq(schema.artists.state, "active"),
        eq(schema.artists.isDemo, false),
        sql`(${ilike(schema.artists.name, `%${q.replace(/[%_]/g, "")}%`)} or ${schema.artists.name} % ${q})`,
        notExists(
          getDb()
            .select({ one: sql`1` })
            .from(schema.artistMembers)
            .where(and(eq(schema.artistMembers.artistId, schema.artists.id), eq(schema.artistMembers.role, "owner"), eq(schema.artistMembers.status, "active"))),
        ),
      ),
    )
    .limit(10);
}

/** Submit a claim. Ownership is granted only after an admin reviews the evidence (Phase 2 admin queue). */
export async function submitClaim(user: CurrentUser, artistId: string, message: string, links: string[]) {
  const db = getDb();
  const claimable = await db
    .select({ id: schema.artists.id })
    .from(schema.artists)
    .where(and(eq(schema.artists.id, artistId), eq(schema.artists.origin, "platform_created"), isNull(schema.artists.mergedIntoId)))
    .limit(1);
  if (!claimable.length) return { ok: false as const, error: "This profile can't be claimed." };
  try {
    await db.transaction(async (tx) => {
      const [req] = await tx
        .insert(schema.artistVerificationRequests)
        .values({ artistId, requesterId: user.id, type: "claim", message, evidence: { links } })
        .returning({ id: schema.artistVerificationRequests.id });
      await audit({ actorId: user.id, action: "artist.claim_requested", entityType: "artist", entityId: artistId, metadata: { requestId: req!.id } }, tx);
    });
  } catch (err) {
    if ((err as { code?: string; cause?: { code?: string } }).code === "23505" || (err as { cause?: { code?: string } }).cause?.code === "23505")
      return { ok: false as const, error: "You already have a pending claim for this profile." };
    throw err;
  }
  return { ok: true as const };
}

export async function submitVerificationRequest(user: CurrentUser, artistId: string, message: string, links: string[]) {
  try {
    await getDb().transaction(async (tx) => {
      await tx.insert(schema.artistVerificationRequests).values({ artistId, requesterId: user.id, type: "verification", message, evidence: { links } });
      await tx.update(schema.artists).set({ verificationStatus: "pending" }).where(and(eq(schema.artists.id, artistId), inArray(schema.artists.verificationStatus, ["unverified", "rejected"])));
      await audit({ actorId: user.id, action: "artist.verification_requested", entityType: "artist", entityId: artistId }, tx);
    });
    return { ok: true as const };
  } catch (err) {
    if ((err as { cause?: { code?: string } }).cause?.code === "23505" || (err as { code?: string }).code === "23505")
      return { ok: false as const, error: "A verification request is already pending." };
    throw err;
  }
}
