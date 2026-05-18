// Validation rules per BUILD_PROMPT.md §6, with regexes adjusted to the
// real "Machine shop data" form formats (see memory: project_biztel_dataset.md).
//
// Pure function — no side effects, no I/O.

import type { RecordRow } from "./extract";

export type ValidationSeverity = "error" | "warning";

export type ValidationError = {
  field: keyof RecordRow | "_record";
  severity: ValidationSeverity;
  message: string;
};

const SHIFT_VALUES = new Set(["I", "II", "III"]);

// Widened to cover the full BiztelAI sample set (6 images):
// op codes can be 5–6 digits, work orders 5–8 digits, machine numbers
// use either MC- or other 2–3 letter prefixes (e.g., ABC-T30).
const REGEX = {
  employee_number: /^BT\d{4}$/,
  operation_code: /^\d{5,6}$/,
  machine_number: /^[A-Z]{2,3}-[A-Z0-9]{2,5}$/,
  work_order_number: /^\d{5,8}$/,
} as const;

const MANDATORY: (keyof RecordRow)[] = [
  "date",
  "shift",
  "employee_number",
  "work_order_number",
  "quantity_produced",
];

const QTY_MAX = 99_999;
const HOURS_MAX = 24;

function isMissing(v: unknown): boolean {
  return v === null || v === undefined || v === "";
}

/**
 * Validate a single extracted record row. Returns an array of errors/warnings.
 * Does NOT return cross-record warnings (e.g., duplicate work_order_number);
 * those are computed by validateBatch().
 */
export function validate(record: RecordRow): ValidationError[] {
  const errs: ValidationError[] = [];

  // ─── Mandatory fields ──────────────────────────────────────────────────────
  for (const f of MANDATORY) {
    if (isMissing(record[f])) {
      errs.push({
        field: f,
        severity: "error",
        message: `${labelFor(f)} is required`,
      });
    }
  }

  // ─── Format checks ─────────────────────────────────────────────────────────
  if (!isMissing(record.shift) && !SHIFT_VALUES.has(String(record.shift))) {
    errs.push({
      field: "shift",
      severity: "error",
      message: `Shift must be one of I / II / III (got "${record.shift}")`,
    });
  }
  if (
    !isMissing(record.employee_number) &&
    !REGEX.employee_number.test(String(record.employee_number))
  ) {
    errs.push({
      field: "employee_number",
      severity: "warning",
      message: `Employee number should match BTnnnn (got "${record.employee_number}")`,
    });
  }
  if (
    !isMissing(record.operation_code) &&
    !REGEX.operation_code.test(String(record.operation_code))
  ) {
    errs.push({
      field: "operation_code",
      severity: "warning",
      message: `Operation code should be 5–6 digits (got "${record.operation_code}")`,
    });
  }
  if (
    !isMissing(record.machine_number) &&
    !REGEX.machine_number.test(String(record.machine_number))
  ) {
    errs.push({
      field: "machine_number",
      severity: "warning",
      message: `Machine number should be a 2–3 letter prefix + "-" + alphanumeric code (got "${record.machine_number}")`,
    });
  }
  if (
    !isMissing(record.work_order_number) &&
    !REGEX.work_order_number.test(String(record.work_order_number))
  ) {
    errs.push({
      field: "work_order_number",
      severity: "warning",
      message: `Work order number should be 5–8 digits (got "${record.work_order_number}")`,
    });
  }

  // ─── Range checks ─────────────────────────────────────────────────────────
  if (record.quantity_produced !== null) {
    if (record.quantity_produced <= 0 || record.quantity_produced > QTY_MAX) {
      errs.push({
        field: "quantity_produced",
        severity: "error",
        message: `Quantity must be > 0 and < ${QTY_MAX}`,
      });
    }
    if (!Number.isInteger(record.quantity_produced)) {
      errs.push({
        field: "quantity_produced",
        severity: "warning",
        message: "Quantity should be an integer",
      });
    }
  }

  if (record.time_taken !== null) {
    if (record.time_taken <= 0 || record.time_taken >= HOURS_MAX) {
      errs.push({
        field: "time_taken",
        severity: "warning",
        message: `Time taken should be > 0 and < ${HOURS_MAX} hours`,
      });
    }
  }

  if (record.date !== null) {
    const d = new Date(record.date);
    if (Number.isNaN(d.getTime())) {
      errs.push({
        field: "date",
        severity: "error",
        message: `Date is not a valid ISO date (got "${record.date}")`,
      });
    } else {
      const now = new Date();
      const oneYearAgo = new Date(
        now.getFullYear() - 1,
        now.getMonth(),
        now.getDate(),
      );
      if (d > now) {
        errs.push({
          field: "date",
          severity: "warning",
          message: "Date is in the future",
        });
      } else if (d < oneYearAgo) {
        errs.push({
          field: "date",
          severity: "warning",
          message: "Date is more than a year old",
        });
      }
    }
  }

  return errs;
}

/**
 * Cross-record check: flag work_order_number values that appear more than once
 * across the input batch. (The §6 brief asks for duplicates within the last
 * 90 days; in this in-memory pass we only flag duplicates inside the batch.
 * A live cross-day check would query the DB before saving.)
 */
export function validateBatch(records: RecordRow[]): ValidationError[][] {
  const perRecord = records.map(validate);

  const counts = new Map<string, number>();
  for (const r of records) {
    if (r.work_order_number) {
      counts.set(
        r.work_order_number,
        (counts.get(r.work_order_number) ?? 0) + 1,
      );
    }
  }
  records.forEach((r, i) => {
    if (r.work_order_number && (counts.get(r.work_order_number) ?? 0) > 1) {
      perRecord[i].push({
        field: "work_order_number",
        severity: "warning",
        message: `Work order ${r.work_order_number} appears multiple times in this document`,
      });
    }
  });

  return perRecord;
}

export function hasErrors(errs: ValidationError[]): boolean {
  return errs.some((e) => e.severity === "error");
}

function labelFor(field: keyof RecordRow): string {
  switch (field) {
    case "date":
      return "Date";
    case "shift":
      return "Shift";
    case "employee_number":
      return "Employee number";
    case "operation_code":
      return "Operation code";
    case "machine_number":
      return "Machine number";
    case "work_order_number":
      return "Work order number";
    case "quantity_produced":
      return "Quantity produced";
    case "time_taken":
      return "Time taken";
    default:
      return String(field);
  }
}
