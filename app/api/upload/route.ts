import { getServiceClient, STORAGE_BUCKET } from "@/lib/supabase";

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Missing 'file' field" }, { status: 400 });
  }
  if (file.size === 0) {
    return Response.json({ error: "File is empty" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json(
      { error: `File too large (max ${MAX_BYTES / 1024 / 1024} MB)` },
      { status: 413 },
    );
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return Response.json(
      { error: `Unsupported file type: ${file.type || "unknown"}` },
      { status: 415 },
    );
  }

  const supabase = getServiceClient();
  const id = crypto.randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const objectPath = `${id}/${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(objectPath, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return Response.json(
      { error: `Storage upload failed: ${uploadError.message}` },
      { status: 500 },
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(objectPath);

  const { data: doc, error: insertError } = await supabase
    .from("documents")
    .insert({
      id,
      file_name: file.name,
      file_url: publicUrl,
      file_type: file.type,
      status: "uploaded",
    })
    .select("id, file_name, file_url, file_type, status, uploaded_at")
    .single();

  if (insertError) {
    await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([objectPath])
      .catch(() => undefined);
    return Response.json(
      { error: `Database insert failed: ${insertError.message}` },
      { status: 500 },
    );
  }

  return Response.json({ document: doc }, { status: 201 });
}
