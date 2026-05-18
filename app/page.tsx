import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload } from "lucide-react";
import { getServiceClient } from "@/lib/supabase";
import {
  DashboardCharts,
  type ChartBucket,
  type TimeSeriesPoint,
} from "@/components/dashboard-charts";

export const dynamic = "force-dynamic";

type DocRow = { status: string; uploaded_at: string };
type ValidationError = { field: string; severity: "error" | "warning"; message: string };
type RecordRow = {
  date: string | null;
  shift: string | null;
  machine_number: string | null;
  operation_code: string | null;
  quantity_produced: number | null;
  validation_errors: ValidationError[] | null;
};

export default async function DashboardPage() {
  const supabase = getServiceClient();
  const [{ data: docsData }, { data: recordsData }] = await Promise.all([
    supabase.from("documents").select("status, uploaded_at"),
    supabase
      .from("extracted_records")
      .select(
        "date, shift, machine_number, operation_code, quantity_produced, validation_errors",
      ),
  ]);

  const docs = (docsData ?? []) as DocRow[];
  const records = (recordsData ?? []) as RecordRow[];

  // ─── Tile metrics ───────────────────────────────────────────────────────
  const totalDocs = docs.length;
  const statusCounts = countBy(docs, (d) => d.status);
  const processedDocs =
    (statusCounts.get("processed") ?? 0) + (statusCounts.get("reviewed") ?? 0);
  const failedDocs = statusCounts.get("failed") ?? 0;

  const totalRecords = records.length;
  const recordsWithErrors = records.filter((r) =>
    (r.validation_errors ?? []).some((e) => e.severity === "error"),
  ).length;
  const passRate =
    totalRecords === 0
      ? null
      : Math.round(((totalRecords - recordsWithErrors) / totalRecords) * 100);

  // ─── Chart series ───────────────────────────────────────────────────────
  const byShift = aggregateBuckets(
    records,
    (r) => r.shift,
    (r) => r.quantity_produced ?? 0,
  ).sort((a, b) => compareShiftLabel(a.label, b.label));

  const byMachine = aggregateBuckets(
    records,
    (r) => r.machine_number,
    (r) => r.quantity_produced ?? 0,
  )
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const topOps = aggregateBuckets(
    records,
    (r) => r.operation_code,
    () => 1,
  )
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const qtyOverTime = aggregateTimeSeries(records);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Production overview from your digitized shift logs.
        </p>
      </div>

      {totalDocs === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No data yet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Upload a Machine Shop Data form to start seeing analytics. The
              first upload populates everything below.
            </p>
            <Link
              href="/upload"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline underline-offset-4"
            >
              <Upload className="h-4 w-4" /> Go to upload
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Tile
              label="Documents uploaded"
              value={totalDocs}
              sub={`${processedDocs} processed · ${failedDocs} failed`}
            />
            <Tile
              label="Records extracted"
              value={totalRecords}
              sub={`${recordsWithErrors} need review`}
            />
            <Tile
              label="Validation pass rate"
              value={passRate === null ? "—" : `${passRate}%`}
              sub={
                passRate === null
                  ? "no records yet"
                  : `${totalRecords - recordsWithErrors} of ${totalRecords} clean`
              }
            />
            <Tile
              label="Total quantity"
              value={records
                .reduce((s, r) => s + (r.quantity_produced ?? 0), 0)
                .toLocaleString()}
              sub="units across all records"
            />
          </div>

          <DashboardCharts
            byShift={byShift}
            byMachine={byMachine}
            topOps={topOps}
            qtyOverTime={qtyOverTime}
          />
        </>
      )}
    </div>
  );
}

function Tile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}

// ─── pure aggregators ────────────────────────────────────────────────────────
function countBy<T>(items: T[], keyFn: (t: T) => string | null): Map<string, number> {
  const m = new Map<string, number>();
  for (const it of items) {
    const k = keyFn(it);
    if (k === null) continue;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

function aggregateBuckets<T>(
  items: T[],
  keyFn: (t: T) => string | null,
  valueFn: (t: T) => number,
): ChartBucket[] {
  const m = new Map<string, number>();
  for (const it of items) {
    const k = keyFn(it);
    if (!k) continue;
    m.set(k, (m.get(k) ?? 0) + valueFn(it));
  }
  return Array.from(m, ([label, value]) => ({ label, value }));
}

function aggregateTimeSeries(records: RecordRow[]): TimeSeriesPoint[] {
  const m = new Map<string, number>();
  for (const r of records) {
    if (!r.date) continue;
    m.set(r.date, (m.get(r.date) ?? 0) + (r.quantity_produced ?? 0));
  }
  return Array.from(m, ([date, value]) => ({ date, value })).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

function compareShiftLabel(a: string, b: string): number {
  const order = ["I", "II", "III"];
  const ai = order.indexOf(a);
  const bi = order.indexOf(b);
  if (ai !== -1 && bi !== -1) return ai - bi;
  return a.localeCompare(b);
}
