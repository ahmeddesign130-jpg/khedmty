"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReceiptAIReview({ paymentId, initialStatus, initialSummary }: { paymentId: string; initialStatus: string | null; initialSummary: string | null }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const labels: Record<string,string> = {
    SUSPICIOUS: "مصطنع / مؤشرات قوية",
    NEEDS_REVIEW: "مشتبه فيه — يحتاج مراجعة",
    NO_CLEAR_SIGNS: "لا توجد مؤشرات واضحة",
  };
  async function review() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/payments/${paymentId}/ai-review`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "تعذر فحص الإيصال.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "حدث خطأ أثناء الفحص.");
    } finally { setBusy(false); }
  }
  return <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="font-black text-indigo-950">فحص بصري بالذكاء الاصطناعي</p><p className="mt-1 text-xs leading-5 text-indigo-800">يفحص مؤشرات التعديل أو التوليد فقط، ولا يتحقق من وصول الأموال.</p></div>
      <button type="button" onClick={review} disabled={busy} className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? "جاري الفحص..." : initialStatus ? "إعادة الفحص" : "فحص صورة الإيصال"}</button>
    </div>
    {initialStatus && <div className="mt-3 rounded-lg bg-white p-3"><p className="font-black text-indigo-950">{labels[initialStatus] || "يحتاج مراجعة"}</p><p className="mt-1 text-sm leading-6 text-slate-700">{initialSummary}</p></div>}
    {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
    <p className="mt-3 text-xs text-slate-500">النتيجة تقديرية وليست دليلاً قاطعاً. قرار اعتماد الدفع يظل لك بعد مطابقة الرقم المرجعي والمبلغ والتاريخ والتحقق من محفظتك.</p>
  </div>;
}
