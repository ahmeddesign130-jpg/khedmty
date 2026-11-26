type StorageObjectInfo = { size: number; mimeType: string };

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function getStorageObjectInfo(bucket: string, objectPath: string): Promise<StorageObjectInfo | null> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  if (!/^[a-z0-9-]{1,60}$/.test(bucket) || !objectPath || objectPath.startsWith("/") || objectPath.includes("..")) return null;
  const encoded = objectPath.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/info/${bucket}/${encoded}`, {
    method: "GET",
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const data = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!data) return null;
  const size = Number(data.size ?? data.contentLength);
  const mimeType = String(data.contentType ?? data.mimetype ?? "");
  if (!Number.isSafeInteger(size) || size <= 0 || !mimeType) return null;
  return { size, mimeType };
}
