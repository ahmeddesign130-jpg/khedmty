import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PaymentSubmissionForm from "./PaymentSubmissionForm";

export const dynamic = "force-dynamic";

export default async function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "CUSTOMER" || user.status !== "ACTIVE") redirect("/account");

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { payments: { orderBy: { createdAt: "desc" } } },
  });
  if (!order || order.customerId !== user.id) notFound();
  if (order.status !== "PENDING_PAYMENT") redirect(`/orders/${order.id}`);

  // One receiving wallet for the platform. Customers may transfer from any bank,
  // wallet, or supported transfer app; the destination remains this wallet.
  const walletNumber = process.env.PAYMENT_WALLET_NUMBER || process.env.ETISALAT_CASH_NUMBER || "";
  const walletReady = Boolean(walletNumber.trim());

  return (
    <main dir="rtl" className="min-h-screen bg-[#f5f6f8]">
      <header className="bg-[#14213d] px-5 py-5 text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="text-2xl font-black text-orange-400">خِدمتي</Link>
          <Link href={`/orders/${order.id}`} className="font-bold">تفاصيل الطلب</Link>
        </div>
      </header>
      <section className="mx-auto max-w-3xl px-5 py-10">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm md:p-9">
          <p className="text-sm font-bold text-orange-600">الخطوة الأخيرة لإرسال طلبك</p>
          <h1 className="mt-2 text-2xl font-black text-[#14213d]">الدفع وإثبات التحويل</h1>
          <p className="mt-3 leading-7 text-slate-600">
            حوّل من أي بنك أو محفظة أو تطبيق تحويل يناسبك إلى محفظة خِدمتي الموضحة أدناه،
            ثم ارفع صورة إيصال التحويل. لن يبدأ تنفيذ الطلب إلا بعد مراجعة الإدارة والتأكد من وصول المبلغ كاملًا.
          </p>

          <div className="mt-7 rounded-2xl bg-[#14213d] p-6 text-white">
            <p className="text-sm text-slate-300">رقم الطلب</p>
            <p className="mt-2 text-xl font-black" dir="ltr">{order.orderNo}</p>
            <p className="mt-5 text-sm text-slate-300">المبلغ المطلوب تحويله</p>
            <p className="mt-2 text-3xl font-black text-orange-400">{order.total.toLocaleString("en-US")} EG</p>
          </div>

          <div className="mt-6 rounded-2xl border border-orange-100 bg-orange-50/60 p-5">
            <div className="flex items-center gap-3">
              <span className="ui-icon-tile"><span aria-hidden="true">◈</span></span>
              <div>
                <h2 className="font-black text-[#14213d]">محفظة استقبال خِدمتي</h2>
                <p className="mt-1 text-sm text-slate-600">حوّل إلى هذا الرقم من أي وسيلة تحويل متاحة لديك</p>
              </div>
            </div>
            {walletReady ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-orange-100 bg-white p-4">
                <strong className="text-2xl font-black tracking-wider text-[#14213d]" dir="ltr">{walletNumber}</strong>
                <button type="button" onClick={undefined} className="hidden" aria-hidden="true">نسخ</button>
              </div>
            ) : (
              <p className="mt-4 rounded-xl bg-white p-4 text-sm font-bold text-orange-800">
                رقم محفظة الاستقبال لم يُضبط بعد. لن نعرض رقمًا غير موثوق؛ يرجى التواصل مع الإدارة.
              </p>
            )}
            <p className="mt-3 text-xs leading-6 text-slate-500">اسم صاحب المحفظة غير معروض. تأكد من الرقم والمبلغ قبل تأكيد التحويل.</p>
          </div>

          {walletReady ? (
            <PaymentSubmissionForm orderId={order.id} amount={order.total} />
          ) : (
            <p className="mt-6 rounded-xl bg-orange-50 p-4 text-sm font-bold text-orange-800">إرسال إثبات الدفع متوقف مؤقتًا حتى تضيف الإدارة رقم المحفظة.</p>
          )}
        </div>
      </section>
    </main>
  );
}
