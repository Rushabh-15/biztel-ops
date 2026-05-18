"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { FileCheck, FileWarning, Loader2, Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type UploadResponse = {
  document: { id: string; file_name: string };
};

const MAX_BYTES = 4 * 1024 * 1024; // keep below Vercel hobby payload limit

export function UploadDropzone() {
  const router = useRouter();
  const [lastError, setLastError] = useState<string | null>(null);

  const upload = useMutation({
    mutationFn: async (file: File): Promise<UploadResponse> => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Upload failed (HTTP ${res.status})`);
      }
      return (await res.json()) as UploadResponse;
    },
    onSuccess: () => {
      setLastError(null);
      router.refresh();
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
      upload.mutate(file);
    },
    [upload],
  );

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
    disabled: upload.isPending,
  });

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
            upload.isPending && "cursor-not-allowed opacity-70",
          )}
        >
          <input {...getInputProps()} />
          {upload.isPending ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : upload.isSuccess ? (
            <FileCheck className="h-8 w-8 text-emerald-600" />
          ) : (
            <Upload className="h-8 w-8 text-muted-foreground" />
          )}
          <div className="text-sm font-medium">
            {upload.isPending
              ? "Uploading…"
              : upload.isSuccess
                ? `Uploaded: ${upload.data?.document.file_name}`
                : isDragActive
                  ? "Drop the file"
                  : "Drag & drop a file, or click to select"}
          </div>
          <div className="text-xs text-muted-foreground">
            JPG, PNG, WEBP, or PDF · one file at a time · up to{" "}
            {MAX_BYTES / 1024 / 1024} MB
          </div>
        </div>

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
