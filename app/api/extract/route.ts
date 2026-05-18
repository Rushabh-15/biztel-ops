import {
  applyConfidenceLayer,
  dropEmptyRecords,
  extractFromImage,
  toRecordRow,
} from "@/lib/extract";
import { validateBatch } from "@/lib/validation";
import { getServiceClient, STORAGE_BUCKET } from "@/lib/supabase";

// Gemini Flash on a single-page form typically returns in ~3–8s; allow headroom.
export const maxDuration = 60;

type Body = { document_id?: string };

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const documentId = body.document_id;
  if (!documentId || typeof documentId !== "string") {
    return Response.json(
      { error: "Missing or invalid 'document_id'" },
      { status: 400 },
    );
  }

  const supabase = getServiceClient();

  // ─── 1. Load the document row ────────────────────────────────────────────
  const { data: doc, error: docErr } = await supabase
    .from("documents")
    .select("id, file_name, file_url, file_type, status")
    .eq("id", documentId)
    .single();

  if (docErr || !doc) {
    return Response.json(
      { error: `Document not found: ${docErr?.message ?? documentId}` },
      { status: 404 },
    );
  }

  // PDF support not in scope for the prototype demo — the sample is JPEG and
  // Gemini Flash vision works best on raster images.
  if (!doc.file_type.startsWith("image/")) {
    return Response.json(
      {
        error: `Extraction supports image/* only for now (got ${doc.file_type}). PDF support coming later.`,
      },
      { status: 415 },
    );
  }

  // ─── 2. Mark processing ──────────────────────────────────────────────────
  await supabase
    .from("documents")
    .update({ status: "processing", error_message: null })
    .eq("id", documentId);

  try {
    // ─── 3. Download file bytes from storage ──────────────────────────────
    const storagePath = derivePathFromPublicUrl(doc.file_url, doc.id);
    const { data: blob, error: dlErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(storagePath);
    if (dlErr || !blob) {
      throw new Error(`Storage download failed: ${dlErr?.message ?? "unknown"}`);
    }
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = Buffer.from(arrayBuffer);

    // ─── 4. Call Gemini ──────────────────────────────────────────────────
    const extraction = await extractFromImage(bytes, doc.file_type);

    // ─── 5. Drop blank rows, layer confidence, normalize, validate ───────
    const cleaned = dropEmptyRecords(extraction.records);
    if (cleaned.length === 0) {
      await supabase
        .from("documents")
        .update({
          status: "failed",
          error_message: "Gemini returned no filled records.",
        })
        .eq("id", documentId);
      return Response.json(
        { error: "No filled records found in this document." },
        { status: 422 },
      );
    }

    const layered = cleaned.map(applyConfidenceLayer);
    const rows = layered.map(toRecordRow);
    const validationErrors = validateBatch(rows);

    // ─── 6. Wipe any prior extraction for this doc + insert fresh ────────
    await supabase
      .from("extracted_records")
      .delete()
      .eq("document_id", documentId);

    const insertPayload = rows.map((row, i) => ({
      document_id: documentId,
      row_index: i + 1,
      date: row.date,
      shift: row.shift,
      employee_number: row.employee_number,
      operation_code: row.operation_code,
      machine_number: row.machine_number,
      work_order_number: row.work_order_number,
      quantity_produced: row.quantity_produced,
      time_taken: row.time_taken,
      raw_extraction: row.raw_extraction,
      confidence: row.confidence,
      validation_errors: validationErrors[i],
    }));

    const { data: inserted, error: insErr } = await supabase
      .from("extracted_records")
      .insert(insertPayload)
      .select("id, row_index");
    if (insErr) {
      throw new Error(`Insert extracted_records failed: ${insErr.message}`);
    }

    // ─── 7. Mark processed ───────────────────────────────────────────────
    await supabase
      .from("documents")
      .update({ status: "processed", error_message: null })
      .eq("id", documentId);

    return Response.json({
      document_id: documentId,
      status: "processed",
      record_count: inserted?.length ?? 0,
      records: inserted,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase
      .from("documents")
      .update({ status: "failed", error_message: message.slice(0, 1000) })
      .eq("id", documentId);
    return Response.json({ error: message }, { status: 500 });
  }
}

// The public URL is of the form
//   {SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}
// We only stored the path implicitly as `{document_id}/{safe_name}`. Recover
// it from either the URL or the id+filename, whichever is reliable.
function derivePathFromPublicUrl(fileUrl: string, documentId: string): string {
  const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
  const idx = fileUrl.indexOf(marker);
  if (idx === -1) {
    // Fallback: we know the prefix is the document id
    throw new Error(
      `Could not parse storage path from URL; expected '${marker}' prefix. URL: ${fileUrl}`,
    );
  }
  const path = fileUrl.slice(idx + marker.length);
  if (!path.startsWith(`${documentId}/`)) {
    throw new Error(
      `Storage path does not start with document id ${documentId}: ${path}`,
    );
  }
  return decodeURIComponent(path);
}
