"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileCheck,
  FileWarning,
  Loader2,
  Sparkles,
  Upload,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type UploadedDocument = { id: string; file_name: string };
type UploadResponse = { document: UploadedDocument };
type ExtractResponse = {
  document_id: string;
  status: string;
  record_count: number;
};

const MAX_BYTES = 4 * 1024 * 1024; // keep below Vercel hobby payload limit

export function UploadDropzone() {
  const router = useRouter();
  const [lastError, setLastError] = useState<string | null>(null);

  const extract = useMutation({
    mutationFn: async (documentId: string): Promise<ExtractResponse> => {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: documentId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? `Extract failed (HTTP ${res.status})`);
      }
      return (await res.json()) as ExtractResponse;
    },
    onSuccess: () => {
      router.refresh();
    },
    onError: (err) => {
      setLastError(
        `Extraction failed — the file is still uploaded. ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      router.refresh(); // surface the 'failed' status row
    },
  });

  const upload = useMutation({
    mutationFn: async (file: File): Promise<UploadResponse> => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? `Upload failed (HTTP ${res.status})`);
      }
      return (await res.json()) as UploadResponse;
    },
    onSuccess: (data) => {
      setLastError(null);
      router.refresh();
      extract.mutate(data.document.id);
    },
    onError: (err) => {
      setLastError(err instanceof Error ? err.message : String(err));
    },
  });

  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      if (rejected[0]) {
        setLastError(rejected[0].errors[0]?.message ?? "File rejected");
        return;
      }
      const file = accepted[0];
      if (!file) return;
      if (file.size > MAX_BYTES) {
        setLastError(
          `File too large (${Math.round(file.size / 1024)} KB). Max ${MAX_BYTES / 1024 / 1024} MB.`,
        );
        return;
      }
      // Reset prior state before starting a new upload
      setLastError(null);
      extract.reset();
      upload.mutate(file);
    },
    [upload, extract],
  );

  const busy = upload.isPending || extract.isPending;

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    multiple: false,
    disabled: busy,
  });

  const lastDocId = upload.data?.document.id;
  const stage = upload.isPending
    ? "uploading"
    : extract.isPending
      ? "extracting"
      : extract.isSuccess
        ? "extracted"
        : "idle";

  return (
    <Card>
      <CardContent className="p-0">
        <div
          {...getRootProps()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-12 text-center transition-colors",
            isDragActive
              ? "border-foreground/40 bg-foreground/[0.03]"
              : "border-border hover:border-foreground/30",
            busy && "cursor-not-allowed opacity-70",
          )}
        >
          <input {...getInputProps()} />
          <DropzoneIcon stage={stage} />
          <div className="text-sm font-medium">
            <DropzoneLabel
              stage={stage}
              isDragActive={isDragActive}
              fileName={upload.data?.document.file_name}
              recordCount={extract.data?.record_count}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            JPG, PNG, WEBP, or PDF · one file at a time · up to{" "}
            {MAX_BYTES / 1024 / 1024} MB
          </div>
        </div>

        {stage === "extracted" && lastDocId && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              Extracted {extract.data?.record_count} record
              {extract.data?.record_count === 1 ? "" : "s"}.
            </span>
            <Link
              href={`/documents/${lastDocId}`}
              className="underline underline-offset-4"
            >
              Review →
            </Link>
          </div>
        )}

        {lastError && (
          <div className="flex items-center gap-2 border-t px-4 py-3 text-sm text-destructive">
            <FileWarning className="h-4 w-4" />
            {lastError}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DropzoneIcon({
  stage,
}: {
  stage: "idle" | "uploading" | "extracting" | "extracted";
}) {
  if (stage === "uploading") {
    return <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />;
  }
  if (stage === "extracting") {
    return <Sparkles className="h-8 w-8 animate-pulse text-foreground" />;
  }
  if (stage === "extracted") {
    return <FileCheck className="h-8 w-8 text-emerald-600" />;
  }
  return <Upload className="h-8 w-8 text-muted-foreground" />;
}

function DropzoneLabel({
  stage,
  isDragActive,
  fileName,
  recordCount,
}: {
  stage: "idle" | "uploading" | "extracting" | "extracted";
  isDragActive: boolean;
  fileName?: string;
  recordCount?: number;
}) {
  if (stage === "uploading") return <>Uploading…</>;
  if (stage === "extracting")
    return <>Extracting with Gemini · this can take 5–15s…</>;
  if (stage === "extracted")
    return (
      <>
        Done — {recordCount ?? 0} record{recordCount === 1 ? "" : "s"} extracted
        from {fileName}
      </>
    );
  if (isDragActive) return <>Drop the file</>;
  return <>Drag &amp; drop a file, or click to select</>;
}
