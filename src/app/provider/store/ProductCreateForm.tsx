"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
export default function ProductCreateForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget; setError(""); setMessage("");
    if (!file) { setError("اختار الملف الرقمي المراد بيعه."); return; }
    setBusy(true);
    try {
      const form = new FormData(formElement);
      const signedResponse = await fetch("/api/uploads/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "digital-product", name: file.name, mimeType: file.type, size: file.size }) });
      const signed = await signedResponse.json();
      if (!signedResponse.ok) throw new Error(signed.message || "تعذر تجهيز رفع الملف.");
      const uploaded = await fetch(signed.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!uploaded.ok) throw new Error("فشل رفع الملف إلى التخزين.");
      const response = await fetch("/api/store/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: String(form.get("title") || ""), description: String(form.get("description") || ""), price: Number(form.get("price")), filePath: signed.objectPath, fileName: file.name, mimeType: file.type, sizeBytes: file.size }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "تعذرت إضافة المنتج.");
      setMessage(data.message); formElement.reset(); setFile(null); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "حدث خطأ غير متوقع."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
    <h2 className="text-xl font-black text-[#14213d]">إضافة منتج رقمي</h2>
    <label className="block text-sm font-bold">اسم المنتج<input name="title" required minLength={3} maxLength={120} className="mt-2 w-full rounded-xl border p-3"/></label>
    <label className="block text-sm font-bold">وصف المنتج<textarea name="description" required minLength={20} maxLength={5000} rows={4} className="mt-2 w-full rounded-xl border p-3"/></label>
    <label className="block text-sm font-bold">سعر المنتج قبل عمولة المنصة (EG)<input name="price" type="number" min="1" max="10000000" step="1" required className="mt-2 w-full rounded-xl border p-3"/></label>
    <label className="block text-sm font-bold">الملف الرقمي الذي سيحصل عليه المشتري<input type="file" required onChange={e => setFile(e.target.files?.[0] || null)} className="mt-2 block w-full rounded-xl border p-3 text-sm"/></label>
    <p className="text-xs leading-6 text-slate-500">حد أقصى 50 MB. الملفات محفوظة بشكل خاص ولا يحصل العميل على رابطها إلا بعد اعتماد الدفع. المنتجات الجديدة تخضع لمراجعة الإدارة.</p>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
    {message && <p role="status" className="rounded-xl bg-green-50 p-3 text-sm font-bold text-green-700">{message}</p>}
    <button disabled={busy} className="w-full rounded-xl bg-orange-500 p-4 font-black text-white disabled:opacity-50">{busy ? "جارٍ الرفع والإرسال..." : "إرسال المنتج للمراجعة"}</button>
  </form>;
}
