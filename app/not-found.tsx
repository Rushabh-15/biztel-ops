import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Not found</h1>
      <Card>
        <CardContent className="space-y-3 py-8">
          <p className="text-sm text-muted-foreground">
            That page doesn&apos;t exist, or the document you&apos;re looking
            for has been removed.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-4"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to dashboard
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
