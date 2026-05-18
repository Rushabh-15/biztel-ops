import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, FileText, History as HistoryIcon, Upload } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Production overview from your digitized shift logs.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dashboard analytics coming online</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Tiles, shift-wise output, machine utilization, and production trends will land here
            once a few documents have been processed.
          </p>
          <p>
            Start by uploading a Machine Shop Data form on the{" "}
            <Link href="/upload" className="underline underline-offset-4 text-foreground">
              Upload
            </Link>{" "}
            page.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link href="/upload" className="block">
          <Card className="h-full transition hover:border-foreground/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Upload a document</CardTitle>
              <Upload className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Drop a shift log or production sheet to extract its records.
              <span className="mt-3 flex items-center gap-1 text-foreground">
                Go to upload <ArrowRight className="h-3 w-3" />
              </span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/history" className="block">
          <Card className="h-full transition hover:border-foreground/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Browse records</CardTitle>
              <HistoryIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Filter, search, and review every extracted production record.
              <span className="mt-3 flex items-center gap-1 text-foreground">
                Go to history <ArrowRight className="h-3 w-3" />
              </span>
            </CardContent>
          </Card>
        </Link>

        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Source documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Each upload is preserved alongside its extracted records and an audit trail of any
            manual edits.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
