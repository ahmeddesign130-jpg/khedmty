"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type AIAnalysis = {
  status: string | null;
  amount: number | null;
  confidence: number | null;
  notes: string | null;
  checkedAt: string | null;
};
type Props = {
  paymentId: string;
  action: (formData: FormData) => void | Promise<void>;
  aiAnalysis: AIAnalysis;
  hasReceipt: boolean;
};
const aiLabels: Record<string, string> = {
  MATCH: "المبلغ الظاهر مطابق مبدئياً",
  MISMATCH: "المبلغ الظاهر لا يطابق المطلوب",
  NOT_RECEIPT: "الصورة لا تبدو إيصال تحويل",
  UNCLEAR: "النتيجة غير واضحة — مراجعة يدوية",
};
export default function PaymentReviewForm({ paymentId, action, aiAnalysis, hasReceipt }: Props) {
  const router = useRouter();
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  async function analyzeReceipt() {
    if (!hasReceipt) return;
    const confirmed = window.confirm("سيتم إرسال نسخة مؤقتة من صورة الإيصال إلى خدمة تحليل آلية خارجية لاستخراج المبلغ والبيانات الظاهرة. التحليل مساعد فقط ولا يؤكد وصول الأموال. هل تريد المتابعة؟");
    if (!confirmed) return;
    setAiBusy(true);
    setAiMessage("");
    try {
      const response = await fetch(`/api/admin/payments/${paymentId}/analyze`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "تعذر تحليل الإيصال.");
      const status = aiLabels[data.analysis?.status] || "اكتمل التحليل المساعد";
      setAiMessage(`${status}. المبلغ المقروء: ${data.analysis?.amount ?? "غير واضح"} EG. الثقة: ${data.analysis?.confidence ?? 0}%.`);
      router.refresh();
    } catch (error) {
      setAiMessage(error instanceof Error ? error.message : "تعذر تحليل الإيصال.");
    } finally {
      setAiBusy(false);
    }
  }
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
      ? "هل راجعت الرقم المرجعي والمبلغ والتاريخ وتأكدت بنفسك من وصول المبلغ؟ التحليل الآلي لا يؤكد وصول الأموال."
      : "هل أنت متأكد من رفض الإيصال؟ سيصل سبب الرفض إلى العميل.";
    if (!window.confirm(message)) event.preventDefault();
  }
  return <div className="mt-5 space-y-4">
    <section className="rounded-xl border border-violet-100 bg-violet-50/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="font-black text-slate-900">فحص الإيصال بالذكاء الاصطناعي</h3><p className="mt-1 text-xs leading-6 text-slate-600">يقرأ المبلغ والعملة والرقم المرجعي الظاهرين في الصورة. لا يتحقق من وصول التحويل فعلياً ولا يعتمد الدفع تلقائياً.</p></div>
        <button type="button" onClick={analyzeReceipt} disabled={aiBusy || !hasReceipt} className="rounded-xl bg-violet-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{aiBusy ? "جاري التحليل..." : "تحليل الإيصال"}</button>
      </div>
      {aiAnalysis.status && <div className="mt-3 rounded-lg bg-white p-3 text-sm">
        <p className="font-black text-slate-900">{aiLabels[aiAnalysis.status] || aiAnalysis.status}</p>
        <p className="mt-1 text-slate-600">المبلغ المقروء: {aiAnalysis.amount ?? "غير واضح"} EG — مستوى الثقة: {aiAnalysis.confidence ?? 0}%</p>
        {aiAnalysis.notes && <p className="mt-2 leading-6 text-slate-600">{aiAnalysis.notes}</p>}
        {aiAnalysis.checkedAt && <p className="mt-2 text-xs text-slate-400">آخر تحليل: {new Date(aiAnalysis.checkedAt).toLocaleString("en-GB")}</p>}
      </div>}
      {aiMessage && <p role="status" aria-live="polite" className="mt-3 rounded-lg bg-white p-3 text-sm font-bold text-slate-700">{aiMessage}</p>}
      <p className="mt-2 text-xs text-slate-500">راجع التحويل في محفظة الاستلام بنفسك قبل الضغط على «تأكيد استلام المبلغ».</p>
    </section>
    <form action={action} onSubmit={submit} className="space-y-3">
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
    </form>
  </div>;
}
