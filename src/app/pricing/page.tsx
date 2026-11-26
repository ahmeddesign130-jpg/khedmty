import Link from "next/link";

export const metadata = {
  title: "الأسعار والرسوم | خِدمتي",
  description: "تعرف على طريقة عرض الأسعار وعمولة منصة خِدمتي والمبلغ المستحق لمقدم الخدمة.",
};

export default function PricingPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-[#f6f7fb] px-4 py-10 text-[#14213d] md:px-6">
      <article className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-10">
        <Link href="/" className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-orange-700">العودة للرئيسية</Link>
        <h1 className="mt-5 text-3xl font-black">الأسعار والرسوم</h1>
        <p className="mt-4 leading-8 text-slate-600">في خِدمتي، يظهر للعميل السعر النهائي قبل تأكيد الطلب، وتُعرض تفاصيل المبلغ بوضوح حتى يعرف كل طرف قيمة العملية.</p>
        <section className="mt-8 rounded-2xl bg-orange-50 p-5">
          <h2 className="text-lg font-black">كيف تُحسب العمولة؟</h2>
          <p className="mt-3 leading-8 text-slate-700">تُحدد المنصة عمولتها وفق إعدادات الإدارة السارية. ويظهر توزيع المبلغ بين صافي مستحقات مقدم الخدمة وعمولة المنصة قبل تأكيد الطلب، ولا يُفترض أن تكون العمولة مبلغًا ثابتًا لكل الخدمات.</p>
        </section>
        <section className="mt-7">
          <h2 className="text-lg font-black">مثال توضيحي</h2>
          <p className="mt-2 leading-8 text-slate-600">إذا كان صافي المبلغ المحدد لمقدم الخدمة 80 EG وكان السعر النهائي للعميل 100 EG، يكون توزيع المثال كالتالي:</p>
          <dl className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200 px-4">
            <div className="flex items-center justify-between gap-4 py-4"><dt className="text-slate-600">المبلغ الذي يدفعه العميل</dt><dd className="font-black tabular-nums">100 EG</dd></div>
            <div className="flex items-center justify-between gap-4 py-4"><dt className="text-slate-600">صافي مستحقات مقدم الخدمة</dt><dd className="font-black tabular-nums">80 EG</dd></div>
            <div className="flex items-center justify-between gap-4 py-4"><dt className="text-slate-600">عمولة المنصة في هذا المثال</dt><dd className="font-black tabular-nums">20 EG</dd></div>
          </dl>
          <p className="mt-3 text-sm leading-7 text-slate-500">هذا مثال لشرح طريقة التوزيع، وليس سعرًا موحدًا لكل الخدمات. المرجع النهائي هو السعر وتفاصيل العمولة المعروضة داخل صفحة الطلب وقت إنشائه.</p>
        </section>
        <section className="mt-8">
          <h2 className="text-lg font-black">الدفع والتحقق</h2>
          <p className="mt-2 leading-8 text-slate-600">قد تتاح وسائل دفع يدوية مثل InstaPay والمحافظ الإلكترونية. رفع صورة الإيصال لا يعني اعتماد الدفع تلقائيًا؛ تتم مراجعة التحويل والتحقق من المبلغ بواسطة الإدارة قبل اعتماد الطلب.</p>
        </section>
        <section className="mt-8">
          <h2 className="text-lg font-black">مستحقات مقدم الخدمة</h2>
          <p className="mt-2 leading-8 text-slate-600">تُحتسب مستحقات مقدم الخدمة بعد خصم عمولة المنصة الموضحة للطلب. وتخضع إتاحة السحب لحالة الطلب وإجراءات المراجعة المعتمدة داخل خِدمتي.</p>
        </section>
        <div className="mt-10 border-t border-slate-200 pt-6"><Link href="/terms" className="font-semibold text-orange-700 underline underline-offset-4">اقرأ الشروط والأحكام</Link></div>
      </article>
    </main>
  );
}
