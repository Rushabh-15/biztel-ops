import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

// ─── Zod schemas ──────────────────────────────────────────────────────────────
// `value` is union-typed because Gemini occasionally returns numbers as strings
// or vice versa; we normalize downstream.
const FieldSchema = z.object({
  value: z.union([z.string(), z.number(), z.null()]),
  confidence: z.number().min(0).max(1),
  notes: z.string().nullable().optional(),
});

const RecordSchema = z.object({
  date: FieldSchema,
  shift: FieldSchema,
  employee_number: FieldSchema,
  operation_code: FieldSchema,
  machine_number: FieldSchema,
  work_order_number: FieldSchema,
  quantity_produced: FieldSchema,
  time_taken: FieldSchema,
});

const ExtractionSchema = z.object({
  records: z.array(RecordSchema),
});

export type ExtractedField = z.infer<typeof FieldSchema>;
export type ExtractedRecord = z.infer<typeof RecordSchema>;
export type ExtractionResult = z.infer<typeof ExtractionSchema>;

export const RECORD_FIELDS: (keyof ExtractedRecord)[] = [
  "date",
  "shift",
  "employee_number",
  "operation_code",
  "machine_number",
  "work_order_number",
  "quantity_produced",
  "time_taken",
];

// ─── Prompt ───────────────────────────────────────────────────────────────────
// Locked to the "Machine shop data" form sample (BiztelAI dataset).
// Field formats here MUST stay in sync with lib/validation.ts.
export const EXTRACTION_PROMPT = `You are an OCR + extraction engine for manufacturing shift/production logs.

The document is a printed "Machine shop data" table form filled by hand. It has these columns:
S. No | Date | Shift | Emp. No | Opn Code | Machine No. | Work Order No. | Qty. Prod. | Time taken (in hrs)

Extract one record per FILLED row. SKIP empty rows entirely — do not emit null-stub records for blank rows.

For each field, return:
  - "value": string or number, or null if truly absent
  - "confidence": 0.0 to 1.0
  - "notes": only include when confidence < 0.7; explain the ambiguity briefly

JSON schema to return:
{
  "records": [
    {
      "date":              { "value": "...", "confidence": 0.0, "notes": "..." },
      "shift":             { ... },
      "employee_number":   { ... },
      "operation_code":    { ... },
      "machine_number":    { ... },
      "work_order_number": { ... },
      "quantity_produced": { ... },
      "time_taken":        { ... }
    }
  ]
}

Field formatting rules (lock to these exactly):
- date: convert DD/MM/YY → ISO "YYYY-MM-DD". 2-digit year YY → 20YY.
- shift: Roman numerals "I", "II", or "III" as written on the form.
- employee_number: format "BTnnnn" as a string (e.g., "BT4710").
- operation_code: 6-digit number as a string (e.g., "856430").
- machine_number: format "MC-nnn" or "MC-nnnn" as a string (e.g., "MC-730").
- work_order_number: 6-digit number as a string (e.g., "165460").
- quantity_produced: positive integer.
- time_taken: positive decimal hours (e.g., 7.5).

Handwriting rules:
- If a character is ambiguous (1 vs l, 0 vs O, 6 vs 0, etc.), set confidence ≤ 0.7 and explain in notes.
- For digits crammed or split with gaps (e.g., "16 54 70"), concatenate to "165470" but note the ambiguity.
- The S.No column is a row index — do NOT extract it as a field.

Return ONLY valid JSON. No markdown fences, no commentary.`;

// ─── Gemini call ──────────────────────────────────────────────────────────────
export async function extractFromImage(
  imageBytes: Buffer,
  mimeType: string,
): Promise<ExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  });

  const result = await model.generateContent([
    EXTRACTION_PROMPT,
    {
      inlineData: {
        data: imageBytes.toString("base64"),
        mimeType,
      },
    },
  ]);

  const text = result.response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(
      `Gemini did not return valid JSON: ${err instanceof Error ? err.message : err}. First 300 chars: ${text.slice(0, 300)}`,
    );
  }

  return ExtractionSchema.parse(parsed);
}

// ─── Post-processing helpers ──────────────────────────────────────────────────
// Drop records where every field's value is null/empty — Gemini sometimes
// emits these even when told to skip blank rows.
export function dropEmptyRecords(records: ExtractedRecord[]): ExtractedRecord[] {
  return records.filter((r) =>
    RECORD_FIELDS.some((f) => {
      const v = r[f].value;
      return v !== null && v !== "" && v !== undefined;
    }),
  );
}

// Regexes for per-field "format-perfect" detection in the confidence layer.
// Numeric fields have no regex — we trust the model's confidence directly.
const FIELD_FORMAT_REGEX: Partial<Record<keyof ExtractedRecord, RegExp>> = {
  date: /^\d{4}-\d{2}-\d{2}$/,
  shift: /^(I|II|III)$/,
  employee_number: /^BT\d{4}$/,
  operation_code: /^\d{6}$/,
  machine_number: /^MC-?\d{3,4}$/,
  work_order_number: /^\d{6}$/,
};

/**
 * Apply the confidence layering rules from BUILD_PROMPT.md §5:
 *   1. Model self-reported confidence is the base.
 *   2. If the value matches the expected regex perfectly → bump to ≥ 0.95.
 *   3. If the value is null/empty → 0.
 *   4. If the model included `notes` (i.e., flagged ambiguity) → cap at 0.7.
 */
export function applyConfidenceLayer(record: ExtractedRecord): ExtractedRecord {
  const out = {} as ExtractedRecord;
  for (const field of RECORD_FIELDS) {
    const fd = record[field];
    let conf = fd.confidence;

    if (fd.value === null || fd.value === "") {
      conf = 0;
    } else {
      const re = FIELD_FORMAT_REGEX[field];
      if (re && typeof fd.value === "string" && re.test(fd.value)) {
        conf = Math.max(conf, 0.95);
      }
      if (fd.notes && fd.notes.trim().length > 0) {
        conf = Math.min(conf, 0.7);
      }
    }

    out[field] = {
      ...fd,
      confidence: Math.max(0, Math.min(1, conf)),
    };
  }
  return out;
}

// ─── DB row normalization ────────────────────────────────────────────────────
// Turn an ExtractedRecord into the column shape stored in `extracted_records`.
export type RecordRow = {
  date: string | null;
  shift: string | null;
  employee_number: string | null;
  operation_code: string | null;
  machine_number: string | null;
  work_order_number: string | null;
  quantity_produced: number | null;
  time_taken: number | null;
  raw_extraction: ExtractedRecord;
  confidence: Record<keyof ExtractedRecord, number>;
};

function toString(v: string | number | null): string | null {
  if (v === null || v === undefined) return null;
  return String(v).trim() || null;
}

function toNumber(v: string | number | null): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function toRecordRow(record: ExtractedRecord): RecordRow {
  const confidence = RECORD_FIELDS.reduce(
    (acc, f) => {
      acc[f] = record[f].confidence;
      return acc;
    },
    {} as Record<keyof ExtractedRecord, number>,
  );

  return {
    date: toString(record.date.value),
    shift: toString(record.shift.value),
    employee_number: toString(record.employee_number.value),
    operation_code: toString(record.operation_code.value),
    machine_number: toString(record.machine_number.value),
    work_order_number: toString(record.work_order_number.value),
    quantity_produced: (() => {
      const n = toNumber(record.quantity_produced.value);
      return n === null ? null : Math.round(n);
    })(),
    time_taken: toNumber(record.time_taken.value),
    raw_extraction: record,
    confidence,
  };
}
