"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import { Progress } from "@/components/ui/primitives";
import { LIMITS } from "@/lib/storage/policy";
import { type UploadProgress, UploadError, uploadFile } from "@/lib/uploads/client";
import { cn } from "@/lib/utils";

type Kind = "artwork" | "avatar" | "cover";

const hints: Record<Kind, string> = {
  artwork: `Square JPG/PNG/WebP, at least ${LIMITS.artworkMinPx}×${LIMITS.artworkMinPx}px, max 10 MB.`,
  avatar: `JPG/PNG/WebP, at least ${LIMITS.avatarMinPx}px, max 10 MB.`,
  cover: `Wide JPG/PNG/WebP, at least ${LIMITS.coverMinWidthPx}px wide, max 10 MB.`,
};

/**
 * Uploads an image directly to storage and stores the resulting upload id in a
 * hidden input (`name`) so the surrounding form submits it.
 */
export function ImageUploadField({
  kind,
  artistId,
  name,
  label,
  currentUrl,
}: {
  kind: Kind;
  artistId: string;
  name: string;
  label: string;
  currentUrl?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [uploadId, setUploadId] = useState("");
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File) {
    setError(null);
    const local = URL.createObjectURL(file);
    setPreview(local);
    try {
      const res = await uploadFile(file, { kind, artistId, onProgress: setProgress });
      setUploadId(res.uploadId);
    } catch (err) {
      setPreview(currentUrl ?? null);
      setUploadId("");
      setError(err instanceof UploadError ? err.message : "Upload failed. Please try again.");
    } finally {
      setProgress(null);
    }
  }

  const busy = progress !== null;
  const shape = kind === "cover" ? "aspect-[3/1] w-full" : kind === "avatar" ? "size-28 rounded-full" : "size-40";

  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className={cn(
            "relative grid place-items-center overflow-hidden rounded-lg border border-dashed border-border-strong bg-surface-2 text-muted transition hover:border-primary hover:text-foreground",
            shape,
          )}
          aria-label={preview ? `Change ${label.toLowerCase()}` : `Upload ${label.toLowerCase()}`}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
            <img src={preview} alt="" className="absolute inset-0 size-full object-cover" />
          ) : (
            <ImagePlus className="size-6" aria-hidden />
          )}
          {busy && (
            <span className="absolute inset-0 grid place-items-center bg-black/60">
              <Loader2 className="size-6 animate-spin text-white" aria-hidden />
            </span>
          )}
        </button>
        {uploadId && !busy && (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
            onClick={() => {
              setUploadId("");
              setPreview(currentUrl ?? null);
            }}
          >
            <X className="size-4" aria-hidden /> Undo
          </button>
        )}
      </div>
      {progress && <Progress value={progress.fraction} label={`Uploading ${label}`} className="max-w-xs" />}
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : (
        <p className="text-xs text-muted">{hints[kind]}</p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
          e.target.value = "";
        }}
      />
      <input type="hidden" name={name} value={uploadId} />
    </div>
  );
}
