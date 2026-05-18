import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getServiceClient } from "@/lib/supabase";
import { ReviewScreen, type ReviewDocument, type ReviewRecord } from "@/components/review-screen";

export const dynamic = "force-dynamic";

export default async function DocumentReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = getServiceClient();

  const [{ data: doc, error: docErr }, { data: records, error: recErr }] =
    await Promise.all([
      supabase
        .from("documents")
        .select(
          "id, file_name, file_url, file_type, status, uploaded_at, error_message",
        )
        .eq("id", id)
        .single(),
      supabase
        .from("extracted_records")
        .select("*")
        .eq("document_id", id)
        .order("row_index", { ascending: true }),
    ]);

  if (docErr || !doc) notFound();
  if (recErr) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Review</h1>
        <p className="text-destructive text-sm">
          Couldn&apos;t load records: {recErr.message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/upload"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to upload
      </Link>
      <ReviewScreen
        document={doc as ReviewDocument}
        records={(records ?? []) as ReviewRecord[]}
      />
    </div>
  );
}
