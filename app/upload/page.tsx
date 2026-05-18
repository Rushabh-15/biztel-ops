import { UploadDropzone } from "@/components/upload-dropzone";
import { RecentUploads } from "@/components/recent-uploads";

export const dynamic = "force-dynamic";

export default function UploadPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Upload</h1>
        <p className="mt-1 text-muted-foreground">
          Drop a Machine Shop Data form (image or PDF) to digitize it into structured records.
        </p>
      </div>
      <UploadDropzone />
      <RecentUploads />
    </div>
  );
}
