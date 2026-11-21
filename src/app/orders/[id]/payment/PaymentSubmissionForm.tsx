"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function PaymentSubmissionForm({ orderId, amount }: { orderId: string; amount: number }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [method, setMethod] = useState("INSTAPAY");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!file) { setError("ارفع صورة إيصال التحويل أولًا."); return; }
    setBusy(true);
    try {
      const signResponse = await fetch("/api/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "receipt", name: file.name, mimeType: file.type, size: file.size }),
      });
      const sign = await signResponse.json();
      if (!signResponse.ok) throw new Error(sign.message || "تعذر تجهيز رفع الإيصال.");

      const upload = await fetch(sign.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!upload.ok) throw new Error("فشل رفع صورة الإيصال.");

      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, method, receiptUrl: sign.objectPath, amount }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "تعذر إرسال إثبات التحويل.");

      router.push(`/orders/${orderId}?payment=submitted`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "حدث خطأ غير متوقع.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-7 space-y-5">
      <div className="rounded-2xl border border-slate-200 p-5">
        <h2 className="font-black text-[#14213d]">إرفاق إيصال التحويل</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">ارفع صورة واضحة يظهر فيها المبلغ وتاريخ التحويل ورقم العملية إن وُجد.</p>
        <label className="mt-4 block text-sm font-bold text-slate-700">
          صورة الإيصال
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] || null)} required className="mt-2 block w-full rounded-xl border border-slate-200 p-3 text-sm" />
        </label>
        <p className="mt-2 text-xs leading-6 text-slate-500">الصيغ المسموحة JPG أو PNG أو WEBP، بحد أقصى 8 MB. الإيصال خاص ولا يظهر إلا للإدارة.</p>
        {file && <p className="mt-3 text-sm font-bold text-green-700">تم اختيار: {file.name}</p>}
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => router.push(`/orders/${orderId}`)} disabled={busy} className="rounded-xl border border-slate-200 px-5 py-4 font-bold text-slate-600 disabled:opacity-50">إلغاء</button>
        <button type="submit" disabled={busy || !file} className="rounded-xl bg-orange-500 px-5 py-4 font-black text-white shadow-lg shadow-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50">{busy ? "جاري إرسال الإيصال..." : "إرسال الطلب للإدارة"}</button>
      </div>
      <p className="text-center text-xs leading-6 text-slate-500">إرسال الصورة لا يعني اعتماد الدفع. الإدارة تتحقق من وصول المبلغ الفعلي قبل قبول الطلب.</p>
    </form>
  );
}
