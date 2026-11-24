"use client";
import type { FormEvent } from "react";

type Props = { paymentId: string; action: (formData: FormData) => void | Promise<void> };
export default function PaymentReviewForm({ paymentId, action }: Props) {
  function submit(event: FormEvent<HTMLFormElement>) {
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const status = submitter?.value;
    const data = new FormData(event.currentTarget);
    if (status === "REJECTED" && !String(data.get("reviewNote") || "").trim()) {
      event.preventDefault();
      window.alert("اكتب سبب رفض الإيصال أولاً.");
      return;
    }
    const message = status === "APPROVED"
      ? "هل راجعت الرقم المرجعي والمبلغ والتاريخ وتأكدت بنفسك من وصول المبلغ؟ لن يتم اعتماد الدفع إلا بعد تأكيدك."
      : "هل أنت متأكد من رفض الإيصال؟ سيصل سبب الرفض إلى العميل.";
    if (!window.confirm(message)) event.preventDefault();
  }
  return <form action={action} onSubmit={submit} className="mt-5 space-y-3">
    <input type="hidden" name="id" value={paymentId}/>
    <label className="block text-sm font-bold">الرقم المرجعي للتحويل (للمراجعة)
      <input name="transferReference" maxLength={120} className="mt-2 w-full rounded-xl border p-3" placeholder="اكتب الرقم المرجعي بعد مطابقته"/>
    </label>
    <label className="block text-sm font-bold">تاريخ التحويل
      <input name="transferDate" type="datetime-local" className="mt-2 w-full rounded-xl border p-3"/>
    </label>
    <label className="block text-sm font-bold">ملاحظة الإدارة / سبب الرفض
      <textarea name="reviewNote" rows={2} maxLength={1000} className="mt-2 w-full rounded-xl border p-3"/>
    </label>
    <div className="flex flex-wrap gap-3">
      <button name="status" value="APPROVED" className="rounded-xl bg-green-600 px-5 py-3 font-bold text-white">تأكيد استلام المبلغ</button>
      <button name="status" value="REJECTED" formNoValidate className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white">رفض الإيصال</button>
    </div>
  </form>;
}
