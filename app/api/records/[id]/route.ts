// PATCH /api/records/[id]
// Body: partial { date, shift, employee_number, operation_code, machine_number,
//                 work_order_number, quantity_produced, time_taken }
//
// - Diffs new values against the current row.
// - Writes one audit_log entry per changed field.
// - Re-runs validation against the new values and persists the result.
// - Marks the record as reviewed.

import { getServiceClient } from "@/lib/supabase";
import { validate } from "@/lib/validation";
import type { RecordRow } from "@/lib/extract";

const EDITABLE_FIELDS = [
  "date",
  "shift",
  "employee_number",
  "operation_code",
  "machine_number",
  "work_order_number",
  "quantity_produced",
  "time_taken",
] as const;
type EditableField = (typeof EDITABLE_FIELDS)[number];

type RecordRowDb = {
  id: string;
  document_id: string;
  date: string | null;
  shift: string | null;
  employee_number: string | null;
  operation_code: string | null;
  machine_number: string | null;
  work_order_number: string | null;
  quantity_produced: number | null;
  time_taken: number | null;
  raw_extraction: unknown;
  confidence: Record<string, number> | null;
  validation_errors: unknown;
  reviewed: boolean;
  reviewed_at: string | null;
  row_index: number | null;
};

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  let body: Partial<Record<EditableField, string | number | null>>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const supabase = getServiceClient();

  // ─── 1. Load the current row ─────────────────────────────────────────────
  const { data: existing, error: loadErr } = await supabase
    .from("extracted_records")
    .select("*")
    .eq("id", id)
    .single();

  if (loadErr || !existing) {
    return Response.json(
      { error: `Record not found: ${loadErr?.message ?? id}` },
      { status: 404 },
    );
  }
  const current = existing as RecordRowDb;

  // ─── 2. Normalize incoming values, compute diff ──────────────────────────
  const updates: Partial<Record<EditableField, string | number | null>> = {};
  const changes: { field: string; old_value: string; new_value: string }[] = [];

  for (const field of EDITABLE_FIELDS) {
    if (!(field in body)) continue;
    const incoming = body[field];
    const next = normalizeForField(field, incoming);
    const prev = current[field];
    if (!equalValues(prev, next)) {
      updates[field] = next as never;
      changes.push({
        field,
        old_value: prev === null || prev === undefined ? "" : String(prev),
        new_value: next === null || next === undefined ? "" : String(next),
      });
    }
  }

  // ─── 3. Re-validate (whether or not anything changed — cheap and correct) ─
  const merged: RecordRow = {
    date: (updates.date ?? current.date) as string | null,
    shift: (updates.shift ?? current.shift) as string | null,
    employee_number: (updates.employee_number ?? current.employee_number) as string | null,
    operation_code: (updates.operation_code ?? current.operation_code) as string | null,
    machine_number: (updates.machine_number ?? current.machine_number) as string | null,
    work_order_number: (updates.work_order_number ?? current.work_order_number) as string | null,
    quantity_produced: (updates.quantity_produced ?? current.quantity_produced) as number | null,
    time_taken: (updates.time_taken ?? current.time_taken) as number | null,
    raw_extraction: current.raw_extraction as RecordRow["raw_extraction"],
    confidence: (current.confidence ?? {}) as RecordRow["confidence"],
  };
  const validation_errors = validate(merged);

  // ─── 4. Write audit log entries ──────────────────────────────────────────
  if (changes.length > 0) {
    const auditPayload = changes.map((c) => ({
      record_id: id,
      field: c.field,
      old_value: c.old_value,
      new_value: c.new_value,
    }));
    const { error: auditErr } = await supabase
      .from("audit_log")
      .insert(auditPayload);
    if (auditErr) {
      return Response.json(
        { error: `Audit log insert failed: ${auditErr.message}` },
        { status: 500 },
      );
    }
  }

  // ─── 5. Persist the update ───────────────────────────────────────────────
  const { data: saved, error: updErr } = await supabase
    .from("extracted_records")
    .update({
      ...updates,
      validation_errors,
      reviewed: true,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (updErr || !saved) {
    return Response.json(
      { error: `Update failed: ${updErr?.message ?? "unknown"}` },
      { status: 500 },
    );
  }

  // ─── 6. Bump document status to 'reviewed' if every record is reviewed ──
  const { count: unreviewed } = await supabase
    .from("extracted_records")
    .select("*", { count: "exact", head: true })
    .eq("document_id", current.document_id)
    .eq("reviewed", false);

  if ((unreviewed ?? 0) === 0) {
    await supabase
      .from("documents")
      .update({ status: "reviewed" })
      .eq("id", current.document_id);
  }

  return Response.json({ record: saved, changes: changes.length });
}

// ─── helpers ─────────────────────────────────────────────────────────────────
function normalizeForField(
  field: EditableField,
  v: string | number | null | undefined,
): string | number | null {
  if (v === null || v === undefined || v === "") return null;
  if (field === "quantity_produced") {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? Math.round(n) : null;
  }
  if (field === "time_taken") {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return typeof v === "string" ? v.trim() : String(v);
}

function equalValues(a: unknown, b: unknown): boolean {
  if (a === null || a === undefined) return b === null || b === undefined || b === "";
  if (b === null || b === undefined) return a === null || a === undefined || a === "";
  return String(a) === String(b);
}
