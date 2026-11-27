"use client";

import { CheckCircle2, FileAudio, Loader2, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/primitives";
import { type UploadProgress, UploadError, uploadFile } from "@/lib/uploads/client";
import { cn, formatDuration } from "@/lib/utils";

export type AudioMeta = { durationMs?: number | null; codec?: string; bitrate?: number; lossless?: boolean; tags?: { title?: string; isrc?: string } };

const phaseLabel = { hashing: "Checking file", uploading: "Uploading", processing: "Processing" };

export function AudioUploadField({ artistId, onReady }: { artistId: string; onReady?: (meta: AudioMeta) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [result, setResult] = useState<{ id: string; meta: AudioMeta } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  async function start(f: File) {
    setFile(f);
    setError(null);
    setResult(null);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await uploadFile(f, { kind: "audio", artistId, onProgress: setProgress, signal: ctrl.signal });
      const meta = res.metadata as AudioMeta;
      setResult({ id: res.uploadId, meta });
      onReady?.(meta);
    } catch (err) {
      setError(err instanceof UploadError ? err.message : "Upload failed. Please try again.");
    } finally {
      setProgress(null);
      abortRef.current = null;
    }
  }

  const busy = progress !== null;

  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium">Audio file</span>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f && !busy) void start(f);
        }}
        className={cn(
          "grid gap-3 rounded-lg border border-dashed p-5 transition",
          dragging ? "border-primary bg-primary/5" : "border-border-strong bg-surface-2",
        )}
      >
        {!file && (
          <div className="grid justify-items-center gap-2 text-center">
            <UploadCloud className="size-8 text-muted" aria-hidden />
            <p className="text-sm text-muted">Drag a file here, or</p>
            <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
              Choose audio file
            </Button>
            <p className="text-xs text-muted-2">MP3, M4A/AAC, WAV or FLAC · up to 200 MB</p>
          </div>
        )}
        {file && (
          <div className="grid gap-3">
            <div className="flex items-center gap-3">
              {result ? (
                <CheckCircle2 className="size-5 shrink-0 text-primary" aria-hidden />
              ) : busy ? (
                <Loader2 className="size-5 shrink-0 animate-spin text-muted" aria-hidden />
              ) : (
                <FileAudio className="size-5 shrink-0 text-muted" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                  {result?.meta.durationMs ? ` · ${formatDuration(result.meta.durationMs)}` : ""}
                  {result?.meta.codec ? ` · ${result.meta.codec}` : ""}
                </p>
              </div>
              {busy ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => abortRef.current?.abort()}>
                  Cancel
                </Button>
              ) : (
                <Button type="button" variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
                  Replace
                </Button>
              )}
            </div>
            {progress && (
              <div className="grid gap-1" aria-live="polite">
                <Progress value={progress.phase === "processing" ? 1 : progress.fraction} label={phaseLabel[progress.phase]} />
                <p className="text-xs text-muted">
                  {phaseLabel[progress.phase]}
                  {progress.phase !== "processing" ? ` · ${Math.round(progress.fraction * 100)}%` : "…"}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="audio/mpeg,audio/mp4,audio/aac,audio/x-m4a,audio/wav,audio/x-wav,audio/flac,.mp3,.m4a,.aac,.wav,.flac"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void start(f);
          e.target.value = "";
        }}
      />
      <input type="hidden" name="audioUploadId" value={result?.id ?? ""} />
    </div>
  );
}
