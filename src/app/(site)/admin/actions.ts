"use server";

import { revalidateTag } from "next/cache";
import { z } from "zod";
import type { FormState } from "../studio/actions";
import { authorize } from "@/lib/auth/session";
import { approveSubmission, decideArtistRequest, rejectSubmission } from "@/lib/catalog/moderation";

/** Public catalogue caches to refresh after a publication change. */
function revalidateCatalog(extra: string[] = []) {
  for (const tag of ["catalog", "artists", "new-releases", "genres", ...extra]) revalidateTag(tag, "max");
}

export async function reviewSubmissionAction(submissionId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const authz = await authorize("admin:review-music");
  if (!authz.ok) return { error: "Not allowed." };
  if (!z.uuid().safeParse(submissionId).success) return { error: "Invalid submission." };
  const decision = fd.get("decision");
  const note = String(fd.get("note") ?? "").trim().slice(0, 2000);
  const res =
    decision === "approve"
      ? await approveSubmission(authz.user.id, submissionId, note || undefined)
      : decision === "reject"
        ? await rejectSubmission(authz.user.id, submissionId, note)
        : { ok: false as const, error: "Choose approve or request changes." };
  if (!res.ok) return { error: res.error };
  revalidateCatalog();
  return { ok: true, message: decision === "approve" ? "Approved and published." : "Changes requested. The artist has been notified." };
}

export async function decideArtistRequestAction(requestId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const authz = await authorize("admin:verify-artists");
  if (!authz.ok) return { error: "Not allowed." };
  const decision = fd.get("decision");
  if (decision !== "approve" && decision !== "reject") return { error: "Choose approve or reject." };
  const res = await decideArtistRequest(authz.user.id, requestId, decision === "approve", String(fd.get("note") ?? "").trim().slice(0, 2000));
  if (!res.ok) return { error: res.error };
  revalidateCatalog();
  return { ok: true, message: decision === "approve" ? "Approved." : "Rejected. The requester has been notified." };
}
