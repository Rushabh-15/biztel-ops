"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { AlertCircle, AlertTriangle, CheckCircle2, Loader2, RotateCw, Save } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ─── Shared types (server + client) ───────────────────────────────────────────
export type ReviewDocument = {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  status: string;
  uploaded_at: string;
  error_message: string | null;
};

type ValidationError = {
  field: string;
  severity: "error" | "warning";
  message: string;
};

export type ReviewRecord = {
  id: string;
  document_id: string;
  row_index: number | null;
  date: string | null;
  shift: string | null;
  employee_number: string | null;
  operation_code: string | null;
  machine_number: string | null;
  work_order_number: string | null;
  quantity_produced: number | null;
  time_taken: number | null;
  confidence: Record<string, number> | null;
  validation_errors: ValidationError[] | null;
  reviewed: boolean;
  reviewed_at: string | null;
};

type EditableField =
  | "date"
  | "shift"
  | "employee_number"
  | "operation_code"
  | "machine_number"
  | "work_order_number"
  | "quantity_produced"
  | "time_taken";

const FIELD_LABELS: Record<EditableField, string> = {
  date: "Date",
  shift: "Shift",
  employee_number: "Employee #",
  operation_code: "Operation code",
  machine_number: "Machine #",
  work_order_number: "Work order #",
  quantity_produced: "Qty. produced",
  time_taken: "Time taken (hrs)",
};

const FIELDS: EditableField[] = [
  "date",
  "shift",
  "employee_number",
  "operation_code",
  "machine_number",
  "work_order_number",
  "quantity_produced",
  "time_taken",
];

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  uploaded: "secondary",
  processing: "outline",
  processed: "default",
  reviewed: "default",
  failed: "destructive",
};

// ─── Top-level ────────────────────────────────────────────────────────────────
export function ReviewScreen({
  document,
  records: initialRecords,
}: {
  document: ReviewDocument;
  records: ReviewRecord[];
}) {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {document.file_name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Uploaded{" "}
            {formatDistanceToNow(new Date(document.uploaded_at), {
              addSuffix: true,
            })}{" "}
            · {initialRecords.length} record
            {initialRecords.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_VARIANT[document.status] ?? "outline"}>
            {document.status}
          </Badge>
          <ReExtractButton documentId={document.id} />
        </div>
      </div>

      {document.status === "failed" && document.error_message && (
        <Card className="border-destructive/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <AlertCircle className="h-4 w-4" /> Extraction failed
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-destructive">
            {document.error_message}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <DocumentPreview document={document} />
        <div className="space-y-4">
          {initialRecords.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No records were extracted from this document yet. Try
                re-extracting.
              </CardContent>
            </Card>
          ) : (
            initialRecords.map((r) => <RecordCard key={r.id} initial={r} />)
          )}
        </div>
      </div>
    </>
  );
}

// ─── Preview pane ─────────────────────────────────────────────────────────────
function DocumentPreview({ document }: { document: ReviewDocument }) {
  const isImage = document.file_type.startsWith("image/");
  return (
    <Card className="self-start">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Source document</CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={document.file_url}
            alt={document.file_name}
            className="w-full rounded border bg-muted object-contain"
          />
        ) : (
          <iframe
            src={document.file_url}
            title={document.file_name}
            className="h-[640px] w-full rounded border"
          />
        )}
        <div className="mt-3 flex justify-end">
          <a
            href={document.file_url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-muted-foreground underline underline-offset-4"
          >
            Open original ↗
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Re-extract control ──────────────────────────────────────────────────────
function ReExtractButton({ documentId }: { documentId: string }) {
  const router = useRouter();
  const m = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: documentId }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? `Extract failed (HTTP ${res.status})`);
      }
      return res.json();
    },
    onSuccess: () => router.refresh(),
  });
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={m.isPending}
      onClick={() => m.mutate()}
    >
      {m.isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <RotateCw className="h-3.5 w-3.5" />
      )}
      {m.isPending ? "Re-extracting…" : "Re-extract"}
    </Button>
  );
}

// ─── Single record card ──────────────────────────────────────────────────────
type FormState = Record<EditableField, string>;

function toFormState(r: ReviewRecord): FormState {
  return {
    date: r.date ?? "",
    shift: r.shift ?? "",
    employee_number: r.employee_number ?? "",
    operation_code: r.operation_code ?? "",
    machine_number: r.machine_number ?? "",
    work_order_number: r.work_order_number ?? "",
    quantity_produced:
      r.quantity_produced === null ? "" : String(r.quantity_produced),
    time_taken: r.time_taken === null ? "" : String(r.time_taken),
  };
}

function RecordCard({ initial }: { initial: ReviewRecord }) {
  const router = useRouter();
  const [record, setRecord] = useState<ReviewRecord>(initial);
  const [form, setForm] = useState<FormState>(toFormState(initial));
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const dirty = FIELDS.some(
    (f) => form[f] !== toFormState(record)[f],
  );

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        date: form.date || null,
        shift: form.shift || null,
        employee_number: form.employee_number || null,
        operation_code: form.operation_code || null,
        machine_number: form.machine_number || null,
        work_order_number: form.work_order_number || null,
        quantity_produced:
          form.quantity_produced === "" ? null : Number(form.quantity_produced),
        time_taken: form.time_taken === "" ? null : Number(form.time_taken),
      };
      const res = await fetch(`/api/records/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? `Save failed (HTTP ${res.status})`);
      }
      return (await res.json()) as { record: ReviewRecord; changes: number };
    },
    onSuccess: (data) => {
      setRecord(data.record);
      setForm(toFormState(data.record));
      setSaveMsg(
        data.changes === 0
          ? "Nothing changed."
          : `Saved ${data.changes} change${data.changes === 1 ? "" : "s"}.`,
      );
      setTimeout(() => setSaveMsg(null), 4000);
      router.refresh();
    },
    onError: (e) =>
      setSaveMsg(e instanceof Error ? e.message : String(e)),
  });

  const validationErrors = record.validation_errors ?? [];
  const errCount = validationErrors.filter((e) => e.severity === "error").length;
  const warnCount = validationErrors.filter((e) => e.severity === "warning").length;
  const errorsByField = validationErrors.reduce<Record<string, ValidationError[]>>(
    (acc, e) => {
      (acc[e.field] ??= []).push(e);
      return acc;
    },
    {},
  );

  return (
    <Card className={cn(errCount > 0 && "border-destructive/40")}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">
          Record {record.row_index ?? "?"}
        </CardTitle>
        <div className="flex items-center gap-2 text-xs">
          {errCount > 0 ? (
            <span className="flex items-center gap-1 text-destructive">
              <AlertCircle className="h-3.5 w-3.5" /> {errCount} error
              {errCount === 1 ? "" : "s"}
            </span>
          ) : warnCount > 0 ? (
            <span className="flex items-center gap-1 text-amber-600">
              <AlertTriangle className="h-3.5 w-3.5" /> {warnCount} warning
              {warnCount === 1 ? "" : "s"}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" /> Valid
            </span>
          )}
          {record.reviewed && (
            <Badge variant="outline" className="text-xs">
              reviewed
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <FieldInput
            key={f}
            field={f}
            value={form[f]}
            onChange={(v) => setForm((s) => ({ ...s, [f]: v }))}
            confidence={record.confidence?.[f]}
            errors={errorsByField[f] ?? []}
          />
        ))}

        <div className="col-span-full mt-2 flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {saveMsg ?? (dirty ? "Unsaved changes" : "Up to date")}
          </div>
          <Button
            size="sm"
            disabled={!dirty || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Single field input with confidence + per-field validation ───────────────
function FieldInput({
  field,
  value,
  onChange,
  confidence,
  errors,
}: {
  field: EditableField;
  value: string;
  onChange: (v: string) => void;
  confidence?: number;
  errors: ValidationError[];
}) {
  const confColor = confidenceColor(confidence);
  const topError = errors[0];

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-medium text-muted-foreground">
          {FIELD_LABELS[field]}
        </label>
        {confidence !== undefined && (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[10px] uppercase tracking-wide tabular-nums",
              confColor.text,
            )}
            title={`Confidence ${Math.round((confidence ?? 0) * 100)}%`}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", confColor.bg)} />
            {Math.round(confidence * 100)}%
          </span>
        )}
      </div>
      {field === "shift" ? (
        <Select value={value || undefined} onValueChange={(v) => onChange(v ?? "")}>
          <SelectTrigger
            className={cn("w-full", confColor.border, topError && "border-destructive")}
          >
            <SelectValue placeholder="Pick a shift" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="I">I</SelectItem>
            <SelectItem value="II">II</SelectItem>
            <SelectItem value="III">III</SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <Input
          type={
            field === "date"
              ? "date"
              : field === "quantity_produced" || field === "time_taken"
                ? "number"
                : "text"
          }
          step={
            field === "time_taken"
              ? "0.1"
              : field === "quantity_produced"
                ? "1"
                : undefined
          }
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(confColor.border, topError && "border-destructive")}
        />
      )}
      {errors.map((e, i) => (
        <p
          key={i}
          className={cn(
            "text-xs",
            e.severity === "error" ? "text-destructive" : "text-amber-600",
          )}
        >
          {e.message}
        </p>
      ))}
    </div>
  );
}

function confidenceColor(c?: number): {
  text: string;
  bg: string;
  border: string;
} {
  if (c === undefined || c === null) {
    return { text: "text-muted-foreground", bg: "bg-muted", border: "" };
  }
  if (c >= 0.85)
    return {
      text: "text-emerald-600",
      bg: "bg-emerald-500",
      border: "",
    };
  if (c >= 0.6)
    return {
      text: "text-amber-600",
      bg: "bg-amber-500",
      border: "border-amber-300",
    };
  return {
    text: "text-red-600",
    bg: "bg-red-500",
    border: "border-red-300",
  };
}
