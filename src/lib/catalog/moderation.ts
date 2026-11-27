import "server-only";
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { audit } from "@/lib/audit";

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];
type Result = { ok: true } | { ok: false; error: string };

async function notify(tx: Tx, userId: string, title: string, body: string, link: string, type: string) {
  await tx.insert(schema.notifications).values({ userId, type, title, body, link });
}

async function moderationLog(tx: Tx, actorId: string, targetType: string, targetId: string, action: string, reason?: string) {
  await tx.insert(schema.moderationActions).values({ actorId, targetType, targetId, action, reason });
}

export async function listPendingSubmissions() {
  return getDb()
    .select({
      id: schema.musicSubmissions.id,
      createdAt: schema.musicSubmissions.createdAt,
      rightsStatementVersion: schema.musicSubmissions.rightsStatementVersion,
      releaseId: schema.releases.id,
      releaseTitle: schema.releases.title,
      releaseType: schema.releases.type,
      artworkKey: schema.releases.artworkKey,
      artistId: schema.artists.id,
      artistName: schema.artists.name,
      artistVerified: schema.artists.verificationStatus,
      submitterEmail: schema.users.email,
    })
    .from(schema.musicSubmissions)
    .innerJoin(schema.releases, eq(schema.releases.id, schema.musicSubmissions.releaseId))
    .innerJoin(schema.artists, eq(schema.artists.id, schema.musicSubmissions.artistId))
    .innerJoin(schema.users, eq(schema.users.id, schema.musicSubmissions.submittedById))
    .where(eq(schema.musicSubmissions.status, "pending"))
    .orderBy(asc(schema.musicSubmissions.createdAt));
}

export async function getSubmissionDetail(submissionId: string) {
  const db = getDb();
  const sub = await db.query.musicSubmissions.findFirst({ where: eq(schema.musicSubmissions.id, submissionId) });
  if (!sub?.releaseId) return null;
  const [release, artist, tracks, submitter] = await Promise.all([
    db.query.releases.findFirst({ where: eq(schema.releases.id, sub.releaseId) }),
    db.query.artists.findFirst({ where: eq(schema.artists.id, sub.artistId) }),
    db.select().from(schema.tracks).where(eq(schema.tracks.releaseId, sub.releaseId)).orderBy(asc(schema.tracks.trackNumber)),
    db.query.users.findFirst({ columns: { name: true, email: true, createdAt: true }, where: eq(schema.users.id, sub.submittedById) }),
  ]);
  if (!release || !artist) return null;
  const uploads = tracks.length
    ? await db.select().from(schema.uploads).where(inArray(schema.uploads.id, tracks.map((t) => t.audioUploadId!).filter(Boolean)))
    : [];
  return { submission: sub, release, artist, tracks, submitter, uploads };
}

/** Approve: publish the release and all its tracks, atomically. */
export async function approveSubmission(actorId: string, submissionId: string, note?: string): Promise<Result> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const sub = await tx.query.musicSubmissions.findFirst({ where: eq(schema.musicSubmissions.id, submissionId) });
    if (!sub || sub.status !== "pending" || !sub.releaseId) return { ok: false as const, error: "This submission is no longer pending." };
    const now = new Date();
    await tx.update(schema.musicSubmissions).set({ status: "approved", reviewerId: actorId, reviewNote: note ?? null, reviewedAt: now }).where(eq(schema.musicSubmissions.id, submissionId));
    const [release] = await tx
      .update(schema.releases)
      .set({ status: "published", publishedAt: now })
      .where(eq(schema.releases.id, sub.releaseId))
      .returning({ id: schema.releases.id, title: schema.releases.title, artistId: schema.releases.artistId });
    await tx
      .update(schema.tracks)
      .set({ status: "published", publishedAt: now, rejectionReason: null })
      .where(and(eq(schema.tracks.releaseId, sub.releaseId), ne(schema.tracks.status, "removed")));
    await moderationLog(tx, actorId, "release", sub.releaseId, "approved", note);
    await audit({ actorId, action: "release.approved", entityType: "release", entityId: sub.releaseId, metadata: { submissionId } }, tx);
    await notify(tx, sub.submittedById, "Your release is live", `“${release!.title}” has been approved and published.`, `/studio/${release!.artistId}/releases/${release!.id}`, "release.approved");
    return { ok: true as const };
  });
}

export async function rejectSubmission(actorId: string, submissionId: string, reason: string): Promise<Result> {
  if (reason.trim().length < 10) return { ok: false, error: "Explain what needs to change (at least 10 characters)." };
  const db = getDb();
  return db.transaction(async (tx) => {
    const sub = await tx.query.musicSubmissions.findFirst({ where: eq(schema.musicSubmissions.id, submissionId) });
    if (!sub || sub.status !== "pending" || !sub.releaseId) return { ok: false as const, error: "This submission is no longer pending." };
    await tx.update(schema.musicSubmissions).set({ status: "rejected", reviewerId: actorId, reviewNote: reason, reviewedAt: new Date() }).where(eq(schema.musicSubmissions.id, submissionId));
    const [release] = await tx
      .update(schema.releases)
      .set({ status: "rejected" })
      .where(eq(schema.releases.id, sub.releaseId))
      .returning({ id: schema.releases.id, title: schema.releases.title, artistId: schema.releases.artistId });
    await tx.update(schema.tracks).set({ status: "rejected", rejectionReason: reason }).where(and(eq(schema.tracks.releaseId, sub.releaseId), eq(schema.tracks.status, "pending_review")));
    await moderationLog(tx, actorId, "release", sub.releaseId, "rejected", reason);
    await audit({ actorId, action: "release.rejected", entityType: "release", entityId: sub.releaseId, metadata: { submissionId } }, tx);
    await notify(tx, sub.submittedById, "Changes needed on your release", `“${release!.title}”: ${reason}`, `/studio/${release!.artistId}/releases/${release!.id}`, "release.rejected");
    return { ok: true as const };
  });
}

/** Take down a published track (e.g. upheld copyright complaint). Reversible via restoreTrack. */
export async function removeTrack(actorId: string, trackId: string, reason: string): Promise<Result> {
  if (reason.trim().length < 5) return { ok: false, error: "Give a reason." };
  return getDb().transaction(async (tx) => {
    const [t] = await tx.update(schema.tracks).set({ status: "removed", removedAt: new Date() }).where(eq(schema.tracks.id, trackId)).returning({ id: schema.tracks.id });
    if (!t) return { ok: false as const, error: "Track not found." };
    await moderationLog(tx, actorId, "track", trackId, "removed", reason);
    await audit({ actorId, action: "track.removed", entityType: "track", entityId: trackId, metadata: { reason } }, tx);
    return { ok: true as const };
  });
}

// ---------------------------------------------------------------------------
// Artist verification & claims
// ---------------------------------------------------------------------------

export async function listPendingArtistRequests() {
  return getDb()
    .select({
      id: schema.artistVerificationRequests.id,
      type: schema.artistVerificationRequests.type,
      message: schema.artistVerificationRequests.message,
      evidence: schema.artistVerificationRequests.evidence,
      createdAt: schema.artistVerificationRequests.createdAt,
      artistId: schema.artists.id,
      artistName: schema.artists.name,
      artistSlug: schema.artists.slug,
      requesterName: schema.users.name,
      requesterEmail: schema.users.email,
    })
    .from(schema.artistVerificationRequests)
    .innerJoin(schema.artists, eq(schema.artists.id, schema.artistVerificationRequests.artistId))
    .innerJoin(schema.users, eq(schema.users.id, schema.artistVerificationRequests.requesterId))
    .where(eq(schema.artistVerificationRequests.status, "pending"))
    .orderBy(asc(schema.artistVerificationRequests.createdAt));
}

export async function decideArtistRequest(actorId: string, requestId: string, approve: boolean, note: string): Promise<Result> {
  if (!approve && note.trim().length < 10) return { ok: false, error: "Explain why (at least 10 characters) — the artist will see this." };
  return getDb().transaction(async (tx) => {
    const req = await tx.query.artistVerificationRequests.findFirst({ where: eq(schema.artistVerificationRequests.id, requestId) });
    if (!req || req.status !== "pending") return { ok: false as const, error: "This request is no longer pending." };
    const now = new Date();
    await tx
      .update(schema.artistVerificationRequests)
      .set({ status: approve ? "approved" : "rejected", reviewerId: actorId, reviewNote: note || null, reviewedAt: now })
      .where(eq(schema.artistVerificationRequests.id, requestId));

    if (req.type === "verification") {
      await tx
        .update(schema.artists)
        .set(approve ? { verificationStatus: "verified", verifiedAt: now } : { verificationStatus: "rejected" })
        .where(eq(schema.artists.id, req.artistId));
    } else if (approve) {
      // Claim approved: requester becomes owner. Platform-created profiles have no other owner.
      await tx
        .insert(schema.artistMembers)
        .values({ artistId: req.artistId, userId: req.requesterId, role: "owner", status: "active", grantedById: actorId })
        .onConflictDoUpdate({
          target: [schema.artistMembers.artistId, schema.artistMembers.userId],
          set: { role: "owner", status: "active", grantedById: actorId },
        });
      await tx.update(schema.users).set({ role: "artist" }).where(and(eq(schema.users.id, req.requesterId), eq(schema.users.role, "listener")));
      // Reject any competing pending claims for the same profile.
      await tx
        .update(schema.artistVerificationRequests)
        .set({ status: "rejected", reviewerId: actorId, reviewNote: "Another claim for this profile was approved.", reviewedAt: now })
        .where(and(eq(schema.artistVerificationRequests.artistId, req.artistId), eq(schema.artistVerificationRequests.type, "claim"), eq(schema.artistVerificationRequests.status, "pending")));
    }
    await moderationLog(tx, actorId, "artist", req.artistId, `${req.type}_${approve ? "approved" : "rejected"}`, note);
    await audit({ actorId, action: `artist.${req.type}_${approve ? "approved" : "rejected"}`, entityType: "artist", entityId: req.artistId, metadata: { requestId } }, tx);
    const label = req.type === "claim" ? "claim" : "verification request";
    await notify(
      tx,
      req.requesterId,
      approve ? `Your ${label} was approved` : `Your ${label} wasn't approved`,
      approve ? "You now have access in the artist studio." : note,
      req.type === "claim" && approve ? `/studio/${req.artistId}` : "/studio",
      `artist.${req.type}`,
    );
    return { ok: true as const };
  });
}
