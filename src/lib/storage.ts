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
  if (!response.ok || !data.token || !data.signedURL) {
    console.error("SUPABASE_SIGN_UPLOAD_ERROR", response.status, data);
    throw new Error("Could not create signed upload URL.");
  }
  const uploadUrl = data.signedURL.startsWith("http") ? data.signedURL : `${url}${data.signedURL.startsWith("/") ? "" : "/"}${data.signedURL}`;
  return { uploadUrl, token: data.token, objectPath };
}
export async function createStorageDownload(bucket: string, objectPath: string) {
  const { url, key } = config();
  const encoded = objectPath.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`${url}/storage/v1/object/sign/${bucket}/${encoded}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 3600 }),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.signedURL) {
    console.error("SUPABASE_SIGN_DOWNLOAD_ERROR", response.status, data);
    return null;
  }
  return data.signedURL.startsWith("http") ? data.signedURL : `${url}${data.signedURL.startsWith("/") ? "" : "/"}${data.signedURL}`;
}
export function serviceMediaPublicUrl(objectPath: string) {
  const { url } = config();
  return `${url}/storage/v1/object/public/service-media/${objectPath.split("/").map(encodeURIComponent).join("/")}`;
}

export async function ensurePrivateStorageBucket(bucket: string, fileSizeLimit: number) {
  const { url, key } = config();
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const encoded = encodeURIComponent(bucket);
  const current = await fetch(`${url}/storage/v1/bucket/${encoded}`, { headers, cache: "no-store" });
  if (current.ok) {
    const details = await current.json().catch(() => ({}));
    if (details.public === true) {
      const updated = await fetch(`${url}/storage/v1/bucket/${encoded}`, {
        method: "PUT", headers, body: JSON.stringify({ public: false, file_size_limit: fileSizeLimit }), cache: "no-store",
      });
      if (!updated.ok) throw new Error("تعذر تأمين مساحة حفظ الملفات الرقمية.");
    }
    return;
  }
  if (current.status !== 404) throw new Error("تعذر التحقق من إعدادات مساحة الملفات الرقمية.");
  const created = await fetch(`${url}/storage/v1/bucket`, {
    method: "POST", headers, body: JSON.stringify({ id: bucket, name: bucket, public: false, file_size_limit: fileSizeLimit }), cache: "no-store",
  });
  if (!created.ok && created.status !== 409) {
    const details = await created.text().catch(() => "");
    console.error("SUPABASE_BUCKET_CREATE_ERROR", created.status, details.slice(0, 500));
    throw new Error("تعذر تجهيز مساحة حفظ الملفات الرقمية.");
  }
  if (created.status === 409) {
    const existing = await fetch(`${url}/storage/v1/bucket/${encoded}`, { headers, cache: "no-store" });
    const details = await existing.json().catch(() => ({}));
    if (!existing.ok || details.public === true) throw new Error("مساحة الملفات الرقمية موجودة لكنها ليست خاصة. يجب تأمينها قبل استقبال الملفات.");
  }
}
