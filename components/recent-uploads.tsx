import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getServiceClient } from "@/lib/supabase";

type DocumentRow = {
  id: string;
  file_name: string;
  file_type: string;
  status: string;
  uploaded_at: string;
};

const statusVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  uploaded: "secondary",
  processing: "outline",
  processed: "default",
  reviewed: "default",
  failed: "destructive",
};

export async function RecentUploads() {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("documents")
    .select("id, file_name, file_type, status, uploaded_at")
    .order("uploaded_at", { ascending: false })
    .limit(20);

  const docs = (data ?? []) as DocumentRow[];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent uploads</CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-destructive">
            Couldn&apos;t load uploads: {error.message}
          </p>
        ) : docs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No uploads yet — drop a file above to get started.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="max-w-[280px] truncate font-medium">
                    {d.file_name}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {d.file_type}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[d.status] ?? "outline"}>
                      {d.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(d.uploaded_at), {
                      addSuffix: true,
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/documents/${d.id}`}
                      className="text-sm underline underline-offset-4"
                    >
                      Review
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
