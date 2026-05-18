import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { getServiceClient } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

type ValidationError = { field: string; severity: "error" | "warning"; message: string };

type RecordRow = {
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
  reviewed: boolean;
  validation_errors: ValidationError[] | null;
  documents: { file_name: string; status: string } | null;
};

function firstOr(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = firstOr(sp.q).trim();
  const machine = firstOr(sp.machine).trim();
  const shift = firstOr(sp.shift).trim();
  const reviewed = firstOr(sp.reviewed).trim();
  const dateFrom = firstOr(sp.date_from);
  const dateTo = firstOr(sp.date_to);
  const page = Math.max(1, Number(firstOr(sp.page) || 1) | 0);

  const supabase = getServiceClient();
  let query = supabase
    .from("extracted_records")
    .select(
      "id, document_id, row_index, date, shift, employee_number, operation_code, machine_number, work_order_number, quantity_produced, time_taken, reviewed, validation_errors, documents ( file_name, status )",
      { count: "exact" },
    )
    .order("date", { ascending: false, nullsFirst: false })
    .order("row_index", { ascending: true })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (q) query = query.ilike("work_order_number", `%${q}%`);
  if (machine) query = query.ilike("machine_number", `%${machine}%`);
  if (shift) query = query.eq("shift", shift);
  if (reviewed === "true") query = query.eq("reviewed", true);
  if (reviewed === "false") query = query.eq("reviewed", false);
  if (dateFrom) query = query.gte("date", dateFrom);
  if (dateTo) query = query.lte("date", dateTo);

  const { data, count, error } = await query;
  const rows = (data ?? []) as unknown as RecordRow[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const hasFilters = Boolean(
    q || machine || shift || reviewed || dateFrom || dateTo,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">History</h1>
        <p className="mt-1 text-muted-foreground">
          Every extracted production record across all uploads.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <form
            action="/history"
            method="get"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6"
          >
            <div className="lg:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">
                Work order
              </label>
              <div className="relative mt-1">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  name="q"
                  defaultValue={q}
                  placeholder="e.g. 165460"
                  className="pl-8"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Machine
              </label>
              <Input
                name="machine"
                defaultValue={machine}
                placeholder="MC-…"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Shift
              </label>
              <select
                name="shift"
                defaultValue={shift}
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">All</option>
                <option value="I">I</option>
                <option value="II">II</option>
                <option value="III">III</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Reviewed
              </label>
              <select
                name="reviewed"
                defaultValue={reviewed}
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">All</option>
                <option value="true">Reviewed</option>
                <option value="false">Needs review</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Date from
              </label>
              <Input
                type="date"
                name="date_from"
                defaultValue={dateFrom}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Date to
              </label>
              <Input
                type="date"
                name="date_to"
                defaultValue={dateTo}
                className="mt-1"
              />
            </div>
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-6">
              <Button type="submit" size="sm">
                Apply filters
              </Button>
              {hasFilters && (
                <Link
                  href="/history"
                  className="text-xs text-muted-foreground underline underline-offset-4"
                >
                  Reset
                </Link>
              )}
              <div className="ml-auto text-xs text-muted-foreground">
                {total === 0 ? "No matches" : `${total} record${total === 1 ? "" : "s"}`}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {error ? (
        <Card>
          <CardContent className="py-8 text-sm text-destructive">
            Couldn&apos;t load records: {error.message}
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {hasFilters
              ? "No records match those filters."
              : "No records yet. Upload a document on the Upload page."}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Emp #</TableHead>
                  <TableHead>Op code</TableHead>
                  <TableHead>Machine</TableHead>
                  <TableHead>Work order</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Hrs</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const errs = r.validation_errors ?? [];
                  const hasErr = errs.some((e) => e.severity === "error");
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium tabular-nums">
                        {r.date ?? "—"}
                      </TableCell>
                      <TableCell>{r.shift ?? "—"}</TableCell>
                      <TableCell className="tabular-nums">
                        {r.employee_number ?? "—"}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {r.operation_code ?? "—"}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {r.machine_number ?? "—"}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {r.work_order_number ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.quantity_produced ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.time_taken ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            hasErr
                              ? "destructive"
                              : r.reviewed
                                ? "default"
                                : "secondary"
                          }
                          className={cn(!hasErr && !r.reviewed && "opacity-80")}
                        >
                          {hasErr ? "needs fix" : r.reviewed ? "reviewed" : "pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/documents/${r.document_id}`}
                          className="text-sm underline underline-offset-4"
                        >
                          Review
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          searchParams={sp}
        />
      )}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  searchParams,
}: {
  page: number;
  totalPages: number;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (k === "page") continue;
    const val = Array.isArray(v) ? v[0] : v;
    if (val) params.set(k, val);
  }
  const prev = new URLSearchParams(params);
  prev.set("page", String(Math.max(1, page - 1)));
  const next = new URLSearchParams(params);
  next.set("page", String(Math.min(totalPages, page + 1)));

  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <Link
        href={`/history?${prev.toString()}`}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground",
          page === 1 && "pointer-events-none opacity-40",
        )}
        aria-disabled={page === 1}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Previous
      </Link>
      <div>
        Page {page} of {totalPages}
      </div>
      <Link
        href={`/history?${next.toString()}`}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground",
          page === totalPages && "pointer-events-none opacity-40",
        )}
        aria-disabled={page === totalPages}
      >
        Next
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
