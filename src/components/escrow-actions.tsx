"use client";

import { useState } from "react";

type Props = {
  orderId: string;
  role: "CUSTOMER" | "PROVIDER" | "SUPER_ADMIN";
  orderStatus: string;
  escrowStatus: "NOT_FUNDED" | "HELD" | "DISPUTED" | "RELEASED" | "REFUNDED";
  dispute: { reason: string; status: string; adminNote: string | null } | null;
};

const labels: Record<Props["escrowStatus"], string> = {
  NOT_FUNDED: "لم يتم تأكيد الدفع",
  HELD: "المبلغ معلّق لحين اكتمال الطلب",
  DISPUTED: "المبلغ موقوف بسبب نزاع",
  RELEASED: "تم تسجيل صرف المستحقات",
  REFUNDED: "تم تسجيل رد المبلغ",
};

export function EscrowActions({ orderId, role, orderStatus, escrowStatus, dispute }: Props) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submitDispute(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/orders/${orderId}/dispute`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }),
      });
      const data = await response.json();
      setMessage(data.message || "تم إرسال الطلب.");
      if (response.ok) window.location.reload();
    } catch { setMessage("تعذر الاتصال. حاول مرة أخرى."); }
    finally { setBusy(false); }
  }

  async function settle(decision: "RELEASE_TO_PROVIDER" | "REFUND_CUSTOMER") {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/escrow/${orderId}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, externalTransferConfirmed: confirmed, note }),
      });
      const data = await response.json();
      setMessage(data.message || "تم إرسال الطلب.");
      if (response.ok) window.location.reload();
    } catch { setMessage("تعذر الاتصال. حاول مرة أخرى."); }
    finally { setBusy(false); }
  }

  return (
    <section className="mt-6 rounded-2xl border border-orange-200 bg-orange-50/70 p-5">
      <h2 className="font-black text-[#14213d]">حماية أموال الطرفين</h2>
      <p className="mt-2 text-sm font-bold text-orange-800">{labels[escrowStatus]}</p>
      <p className="mt-2 text-xs leading-6 text-slate-600">
        هذا سجل حجز وتسوية داخلي للطلب فقط. التحويلات الحالية يدوية، ولا يحتفظ الموقع بالأموال في حساب ضمان مستقل ولا ينفذ تحويلًا تلقائيًا.
      </p>
      {dispute && <div className="mt-4 rounded-xl bg-white p-3 text-sm">
        <p className="font-bold">سبب النزاع: {dispute.reason}</p>
        <p className="mt-1 text-slate-600">الحالة: {dispute.status}</p>
        {dispute.adminNote && <p className="mt-2 text-slate-600">ملاحظة الإدارة: {dispute.adminNote}</p>}
      </div>}
      {role !== "SUPER_ADMIN" && escrowStatus === "HELD" && ["PAID", "IN_PROGRESS", "DELIVERED", "REVISION_REQUESTED"].includes(orderStatus) && !dispute && (
        <form onSubmit={submitDispute} className="mt-4 space-y-3">
          <label className="block text-sm font-bold text-slate-700">فتح نزاع مع توضيح السبب
            <textarea required minLength={10} maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3" rows={3} />
          </label>
          <button disabled={busy} className="rounded-xl bg-[#14213d] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? "جارٍ الإرسال..." : "فتح نزاع وإيقاف التسوية"}</button>
        </form>
      )}
      {role === "SUPER_ADMIN" && (escrowStatus === "HELD" || escrowStatus === "DISPUTED") && (
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-bold text-slate-700">ملاحظة التسوية
            <textarea value={note} onChange={e => setNote(e.target.value)} maxLength={1000} rows={2} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3" />
          </label>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-1" />
            أؤكد أنني نفذت التحويل الخارجي يدويًا بالفعل (صرف لمقدم الخدمة أو رد للعميل).
          </label>
          <div className="flex flex-wrap gap-2">
            {(orderStatus === "COMPLETED" || escrowStatus === "DISPUTED") && <button type="button" disabled={busy || !confirmed} onClick={() => settle("RELEASE_TO_PROVIDER")} className="rounded-xl bg-green-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-40">تسجيل صرف مستحقات مقدم الخدمة</button>}
            {escrowStatus === "DISPUTED" && <button type="button" disabled={busy || !confirmed} onClick={() => settle("REFUND_CUSTOMER")} className="rounded-xl bg-red-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-40">تسجيل رد المبلغ للعميل</button>}
          </div>
        </div>
      )}
      {message && <p role="status" className="mt-3 text-sm font-bold text-[#14213d]">{message}</p>}
    </section>
  );
}
