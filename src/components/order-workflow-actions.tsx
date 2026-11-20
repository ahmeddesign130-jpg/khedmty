"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  orderId: string;
  role: "CUSTOMER" | "PROVIDER" | "SUPER_ADMIN";
  orderStatus: string;
  escrowStatus: string | null;
};

export function OrderWorkflowActions({ orderId, role, orderStatus, escrowStatus }: Props) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function updateStatus(status: string) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/orders/" + orderId + "/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "تعذر تحديث الطلب.");
      setMessage(data.message || "تم تحديث الطلب.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "حدث خطأ.");
    } finally {
      setBusy(false);
    }
  }

  async function openDispute() {
    if (reason.trim().length < 10) {
      setMessage("اكتب سبب النزاع في 10 أحرف على الأقل.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/orders/" + orderId + "/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "تعذر فتح النزاع.");
      setMessage(data.message || "تم فتح النزاع.");
      setReason("");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "حدث خطأ.");
    } finally {
      setBusy(false);
    }
  }

  const canDispute = (role === "CUSTOMER" || role === "PROVIDER")
    && escrowStatus === "HELD"
    && ["PAID", "IN_PROGRESS", "DELIVERED"].includes(orderStatus);

  if (role === "SUPER_ADMIN") return null;

  return (
    <section className="mt-7 space-y-4">
      {role === "CUSTOMER" && orderStatus === "PENDING_PAYMENT" && (
        <button disabled={busy} onClick={() => updateStatus("CANCELLED")} className="rounded-xl border border-red-200 px-5 py-3 font-bold text-red-600 disabled:opacity-50">
          إلغاء الطلب قبل الدفع
        </button>
      )}
      {role === "CUSTOMER" && orderStatus === "DELIVERED" && (
        <div className="flex flex-wrap gap-3">
          <button disabled={busy} onClick={() => updateStatus("COMPLETED")} className="rounded-xl bg-green-600 px-5 py-3 font-bold text-white disabled:opacity-50">
            تأكيد استلام العمل
          </button>
          <button disabled={busy} onClick={() => updateStatus("REVISION_REQUESTED")} className="rounded-xl border border-orange-300 px-5 py-3 font-bold text-orange-700 disabled:opacity-50">
            طلب تعديل
          </button>
        </div>
      )}
      {canDispute && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="font-black text-amber-950">فتح نزاع مع الإدارة</h3>
          <p className="mt-1 text-sm leading-6 text-amber-900">سيتم إيقاف أي تسجيل للصرف الداخلي حتى تراجع الإدارة النزاع. لا يعني ذلك أن الأموال محفوظة في حساب ضمان منفصل.</p>
          <textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1500} rows={3} placeholder="اشرح المشكلة بوضوح..." className="mt-3 w-full rounded-xl border border-amber-200 bg-white p-3 text-sm text-slate-900" />
          <button disabled={busy || reason.trim().length < 10} onClick={openDispute} className="mt-3 rounded-xl bg-amber-700 px-5 py-3 font-bold text-white disabled:opacity-50">إرسال النزاع للإدارة</button>
        </div>
      )}
      {message && <p role="status" className="rounded-xl bg-slate-100 p-3 text-sm font-bold text-slate-700">{message}</p>}
    </section>
  );
}
