"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  orderId: string;
  escrowStatus: string;
  orderStatus: string;
  disputeId: string | null;
  disputeStatus: string | null;
};

export function AdminEscrowActions({ orderId, escrowStatus, orderStatus, disputeId, disputeStatus }: Props) {
  const router = useRouter();
  const [resolutionNote, setResolutionNote] = useState("");
  const [externalReference, setExternalReference] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function startReview() {
    if (!disputeId) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/disputes/" + disputeId + "/review", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "UNDER_REVIEW" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "تعذر بدء المراجعة.");
      setMessage(data.message || "بدأت المراجعة.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "حدث خطأ.");
    } finally {
      setBusy(false);
    }
  }

  async function resolve(decision: "RELEASE_TO_PROVIDER" | "REFUND_CUSTOMER") {
    if (resolutionNote.trim().length < 10 || externalReference.trim().length < 3) {
      setMessage("أدخل سبب القرار ومرجع التحويل اليدوي بعد تنفيذه.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/escrow/" + orderId + "/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, resolutionNote, externalReference }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "تعذر تسجيل القرار.");
      setMessage(data.message || "تم تسجيل القرار.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "حدث خطأ.");
    } finally {
      setBusy(false);
    }
  }

  const canRelease = (escrowStatus === "HELD" && orderStatus === "COMPLETED")
    || (escrowStatus === "DISPUTED" && orderStatus === "DISPUTED" && disputeStatus === "UNDER_REVIEW");
  const canRefund = escrowStatus === "DISPUTED" && orderStatus === "DISPUTED" && disputeStatus === "UNDER_REVIEW";

  if (escrowStatus === "RELEASED" || escrowStatus === "REFUNDED") {
    return <p className="mt-4 rounded-xl bg-slate-100 p-3 text-sm font-bold text-slate-700">تم إغلاق السجل المالي لهذا الطلب؛ لا يمكن تكرار الصرف أو الاسترداد.</p>;
  }

  return (
    <div className="mt-5 space-y-3 border-t border-slate-200 pt-5">
      {disputeId && disputeStatus === "OPEN" && (
        <button disabled={busy} onClick={startReview} className="rounded-xl bg-amber-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">بدء مراجعة النزاع</button>
      )}
      {(canRelease || canRefund) && (
        <>
          <p className="text-sm leading-6 text-slate-600">نفّذ التحويل الخارجي يدويًا أولًا، ثم سجّل مرجعه هنا. هذا النموذج لا يرسل أموالًا ولا ينفذ تحويلًا تلقائيًا.</p>
          <label className="block text-sm font-bold text-slate-700">سبب القرار<textarea value={resolutionNote} onChange={(event) => setResolutionNote(event.target.value)} maxLength={1500} rows={3} className="mt-2 w-full rounded-xl border border-slate-200 p-3" /></label>
          <label className="block text-sm font-bold text-slate-700">مرجع التحويل الخارجي بعد تنفيذه<input value={externalReference} onChange={(event) => setExternalReference(event.target.value)} maxLength={120} className="mt-2 w-full rounded-xl border border-slate-200 p-3" placeholder="رقم العملية أو المرجع" /></label>
          <div className="flex flex-wrap gap-2">
            {canRelease && <button disabled={busy} onClick={() => resolve("RELEASE_TO_PROVIDER")} className="rounded-xl bg-green-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">تسجيل صرف مقدم الخدمة</button>}
            {canRefund && <button disabled={busy} onClick={() => resolve("REFUND_CUSTOMER")} className="rounded-xl bg-red-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">تسجيل استرداد العميل</button>}
          </div>
        </>
      )}
      {escrowStatus === "HELD" && orderStatus !== "COMPLETED" && <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-700">لا يمكن تسجيل الصرف قبل تأكيد العميل للاستلام أو فتح نزاع وحسمه.</p>}
      {escrowStatus === "DISPUTED" && disputeStatus === "OPEN" && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">ابدأ مراجعة النزاع أولًا؛ لن يظهر إجراء الصرف أو الاسترداد قبل تسجيل مرحلة المراجعة.</p>}
      {message && <p role="status" className="rounded-xl bg-slate-100 p-3 text-sm font-bold text-slate-700">{message}</p>}
    </div>
  );
}
