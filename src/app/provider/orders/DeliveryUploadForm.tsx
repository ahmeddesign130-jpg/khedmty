"use client";
import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";

type Item = { file: File; objectPath: string };
export default function DeliveryUploadForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  function choose(event: ChangeEvent<HTMLInputElement>) {
    setFiles(Array.from(event.target.files || []));
    setError("");
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!files.length) { setError("ارفق ملفاً واحداً على الأقل قبل التسليم."); return; }
    if (files.length > 10) { setError("الحد الأقصى 10 ملفات في المرة الواحدة."); return; }
    setBusy(true);
    try {
      const uploaded: Item[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setStatus(`جاري رفع الملف ${i + 1} من ${files.length}...`);
        const signedResponse = await fetch("/api/uploads/sign", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "delivery", orderId, name: file.name, mimeType: file.type, size: file.size }),
        });
        const signed = await signedResponse.json();
        if (!signedResponse.ok) throw new Error(signed.message || "تعذر تجهيز رفع الملف.");
        const uploadResponse = await fetch(signed.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
        if (!uploadResponse.ok) throw new Error(`فشل رفع الملف: ${file.name}`);
        uploaded.push({ file, objectPath: signed.objectPath });
      }
      setStatus("جاري إرسال الملفات للإدارة للمراجعة...");
      const saveResponse = await fetch(`/api/orders/${orderId}/delivery`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: uploaded.map(({ file, objectPath }) => ({
          objectPath, fileName: file.name, mimeType: file.type, sizeBytes: file.size,
        })) }),
      });
      const saved = await saveResponse.json();
      if (!saveResponse.ok) throw new Error(saved.message || "تعذر تسجيل ملفات التسليم.");
      setStatus("تم إرسال الملفات للإدارة للمراجعة. سيصل إشعار للعميل بعد اعتماد التسليم.");
      setFiles([]);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "حدث خطأ غير متوقع.");
    } finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="mt-4 rounded-xl border border-orange-100 bg-orange-50/50 p-4 space-y-3">
    <label className="block text-sm font-bold text-slate-800">ملفات العمل النهائي
      <input type="file" multiple onChange={choose} accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime,application/pdf,application/zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="mt-2 block w-full rounded-xl border border-slate-200 bg-white p-3 text-sm" />
    </label>
    <p className="text-xs leading-6 text-slate-500">حتى 10 ملفات، 50 MB للملف. لا يمكن تسليم الطلب من دون إرفاق الملفات. ستظهر الملفات للعميل صاحب الطلب فقط والإدارة.</p>
    {files.length > 0 && <p className="text-sm font-bold text-slate-700">تم اختيار {files.length} ملف</p>}
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
    {status && <p role="status" aria-live="polite" className="rounded-lg bg-blue-50 p-3 text-sm font-bold text-blue-700">{status}</p>}
    <button type="submit" disabled={busy || !files.length} className="w-full rounded-xl bg-green-600 px-4 py-3 font-black text-white disabled:opacity-50">{busy ? "جاري التسليم..." : "إرسال العمل للإدارة للمراجعة"}</button>
  </form>;
}
