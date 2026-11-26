const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
export function storageReady() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}
function config() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Storage is not configured.");
  return { url: SUPABASE_URL, key: SUPABASE_SERVICE_ROLE_KEY };
}
export async function createStorageUpload(bucket: string, objectPath: string) {
  const { url, key } = config();
  const encoded = objectPath.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`${url}/storage/v1/object/upload/sign/${bucket}/${encoded}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ upsert: false }),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  // Supabase Storage may return the signed path as "url" (older response)
  // or "signedURL"/"signedUrl" depending on the API version.
  const signedPath = [data.signedURL, data.signedUrl, data.url].find(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
  if (!response.ok || !data.token || !signedPath) {
    // Never log the response body: it can contain a live signed upload token.
    console.error("SUPABASE_SIGN_UPLOAD_ERROR", response.status, {
      message: typeof data.message === "string" ? data.message : undefined,
      error: typeof data.error === "string" ? data.error : undefined,
      statusCode: data.statusCode,
    });
    throw new Error("Could not create signed upload URL.");
  }
  const uploadUrl = signedPath.startsWith("http")
    ? signedPath
    : `${url}${signedPath.startsWith("/storage/v1/") ? "" : "/storage/v1"}${signedPath.startsWith("/") ? "" : "/"}${signedPath}`;
  // Supabase signed-upload endpoints require the one-time token on the upload URL.
  // The server response also exposes it separately as data.token; returning a URL
  // without this query parameter makes the browser's PUT request fail.
  const signedUploadUrl = new URL(uploadUrl);
  if (!signedUploadUrl.searchParams.has("token")) {
    signedUploadUrl.searchParams.set("token", data.token);
  }
  return { uploadUrl: signedUploadUrl.toString(), token: data.token, objectPath };
}
export async function createStorageDownload(bucket: string, objectPath: string, expiresIn = 3600) {
  const { url, key } = config();
  const encoded = objectPath.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`${url}/storage/v1/object/sign/${bucket}/${encoded}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: Math.max(60, Math.min(expiresIn, 3600)) }),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  const signedPath = [data.signedURL, data.signedUrl, data.url].find(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
  if (!response.ok || !signedPath) {
    // Do not log the response body: signed URLs may contain access tokens.
    console.error("SUPABASE_SIGN_DOWNLOAD_ERROR", response.status, {
      message: typeof data.message === "string" ? data.message : undefined,
      error: typeof data.error === "string" ? data.error : undefined,
      statusCode: data.statusCode,
    });
    return null;
  }
  if (signedPath.startsWith("http://") || signedPath.startsWith("https://")) return signedPath;
  const normalizedPath = signedPath.startsWith("/") ? signedPath : `/${signedPath}`;
  const storagePath = normalizedPath.startsWith("/storage/v1/")
    ? normalizedPath
    : `/storage/v1${normalizedPath}`;
  return `${url}${storagePath}`;
}
export function serviceMediaPublicUrl(objectPath: string) {
  const { url } = config();
  return `${url}/storage/v1/object/public/service-media/${objectPath.split("/").map(encodeURIComponent).join("/")}`;
}
