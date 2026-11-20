import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrderWorkflowActions } from "@/components/order-workflow-actions";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  PENDING_PAYMENT: "في انتظار الدفع",
  PAYMENT_REVIEW: "الدفع قيد المراجعة",
  PAID: "تم تأكيد الدفع",
  IN_PROGRESS: "جاري تنفيذ الطلب",
  DELIVERED: "تم تسليم الخدمة",
  REVISION_REQUESTED: "مطلوب تعديل",
  COMPLETED: "أكد العميل الاستلام",
  DISPUTED: "النزاع قيد مراجعة الإدارة",
  REFUNDED: "تم تسجيل الاسترداد",
  CANCELLED: "ملغي",
  REJECTED: "مرفوض",
};
const paymentLabels: Record<string, string> = {
  PENDING_REVIEW: "قيد مراجعة الإدارة",
  APPROVED: "تم اعتماد التحويل",
  REJECTED: "تم رفض التحويل",
};
const escrowLabels: Record<string, string> = {
  HELD: "محجوز محاسبيًا",
  DISPUTED: "متوقف بسبب نزاع",
  RELEASED: "تم تسجيل الصرف اليدوي",
  REFUNDED: "تم تسجيل الاسترداد اليدوي",
};

export default async function OrderDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const query = await searchParams;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, displayName: true } },
      provider: { select: { id: true, displayName: true } },
      payments: { orderBy: { createdAt: "desc" } },
      escrow: true,
      dispute: true,
    },
  });
  if (!order) notFound();

  const isAdmin = user.role === "SUPER_ADMIN";
  const isCustomer = order.customerId === user.id;
  const isProvider = order.providerId === user.id;
  if (!isAdmin && !isCustomer && !isProvider) redirect("/account");

  const service = await prisma.service.findUnique({
    where: { id: order.serviceId },
    select: { title: true, serviceNo: true },
  });
  const latestPayment = order.payments[0];

  return (
    <main dir="rtl" className="min-h-screen bg-[#f5f6f8]">
      <header className="bg-[#14213d] px-5 py-5 text-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/" className="text-2xl font-black text-orange-400">خِدمتي</Link>
          <Link href={isProvider ? "/provider/orders" : isAdmin ? "/admin/orders" : "/orders"} className="font-bold">العودة للطلبات</Link>
        </div>
      </header>
      <section className="mx-auto max-w-4xl px-5 py-10">
        <div className="rounded-3xl bg-white p-6 shadow-sm md:p-9">
          {query.payment === "submitted" && <p className="mb-5 rounded-xl bg-green-50 p-4 font-bold text-green-700">تم إرسال إثبات الدفع. الطلب الآن قيد مراجعة الإدارة.</p>}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-black text-[#14213d]">تفاصيل الطلب</h1>
            <span className="rounded-xl bg-orange-50 px-4 py-2 text-sm font-bold text-orange-700">{statusLabels[order.status] || order.status}</span>
          </div>
          <div className="mt-7 rounded-2xl bg-slate-50 p-5"><p className="text-sm text-slate-500">رقم الطلب</p><p className="mt-2 text-xl font-black text-[#14213d]">{order.orderNo}</p></div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div><p className="text-sm text-slate-500">الخدمة</p><p className="mt-1 font-bold">{service?.title || "الخدمة"}</p>{isAdmin && service && <p className="mt-1 text-xs text-slate-500">رقم الخدمة: {service.serviceNo}</p>}</div>
            <div><p className="text-sm text-slate-500">العميل</p><p className="mt-1 font-bold">{order.customer.displayName}</p></div>
            <div><p className="text-sm text-slate-500">مقدم الخدمة</p><p className="mt-1 font-bold">{order.provider.displayName}</p></div>
            {isAdmin && <div><p className="text-sm text-slate-500">وسيلة تواصل العميل (للإدارة فقط)</p><p className="mt-1 font-bold" dir="auto">{order.customerContact || "غير محددة"}</p></div>}
          </div>
          <div className="mt-7 rounded-2xl bg-[#14213d] p-6 text-white">
            <h2 className="text-lg font-black">ملخص المبلغ</h2>
            <div className="mt-5 space-y-4 text-sm">
              <div className="flex justify-between gap-3"><span className="text-slate-300">سعر الخدمة</span><span className="font-bold">{order.servicePrice.toLocaleString("en-US")} EG</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-300">عمولة المنصة الثابتة</span><span className="font-bold">{order.commission.toLocaleString("en-US")} EG</span></div>
              <div className="flex justify-between border-t border-white/20 pt-4"><span className="font-bold">الإجمالي</span><span className="text-2xl font-black text-orange-400">{order.total.toLocaleString("en-US")} EG</span></div>
            </div>
          </div>

          {order.escrow && (
            <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-black text-orange-950">حالة المبلغ</h2><span className="rounded-full bg-white px-3 py-2 text-sm font-bold text-orange-800">{escrowLabels[order.escrow.status]}</span></div>
              <p className="mt-3 text-sm leading-7 text-orange-950">
                {order.escrow.status === "HELD" && "تم تسجيل إجمالي الدفع كرصيد محجوز محاسبيًا داخل خِدمتي. لا يُسجل الصرف قبل تأكيد العميل للاستلام أو حسم نزاع الإدارة. هذا ليس حساب ضمان منفصلًا ولا يعني أن الأموال محفوظة لدى جهة مستقلة."}
                {order.escrow.status === "DISPUTED" && "تم إيقاف أي تسجيل للصرف الداخلي لحين مراجعة الإدارة للنزاع."}
                {order.escrow.status === "RELEASED" && "سجلت الإدارة صرف مستحق مقدم الخدمة يدويًا بمرجع تحويل خارجي. الموقع لا ينفذ التحويل بنفسه."}
                {order.escrow.status === "REFUNDED" && "سجلت الإدارة استرداد العميل يدويًا بمرجع تحويل خارجي. الموقع لا ينفذ التحويل بنفسه."}
              </p>
              {isAdmin && order.escrow.externalReference && <p className="mt-3 text-xs text-orange-900">مرجع التحويل: <span dir="auto" className="font-bold">{order.escrow.externalReference}</span></p>}
            </div>
          )}

          {latestPayment && (
            <div className="mt-6 rounded-2xl border border-slate-200 p-5">
              <h2 className="font-black text-[#14213d]">آخر عملية دفع</h2>
              <p className="mt-3 text-sm text-slate-600">الحالة: {paymentLabels[latestPayment.status] || latestPayment.status}</p>
              <p className="mt-2 text-sm text-slate-600">المبلغ: {latestPayment.amount.toLocaleString("en-US")} EG</p>
              {isAdmin && latestPayment.reviewNote && <p className="mt-3 rounded-lg bg-orange-50 p-3 text-sm">ملاحظة الإدارة: {latestPayment.reviewNote}</p>}
            </div>
          )}

          {order.dispute && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="font-black text-amber-950">النزاع</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-amber-950">{order.dispute.reason}</p>
              <p className="mt-3 text-sm font-bold text-amber-900">الحالة: {order.dispute.status === "OPEN" ? "مفتوح" : order.dispute.status === "UNDER_REVIEW" ? "قيد مراجعة الإدارة" : "تم الحسم"}</p>
              {order.dispute.resolutionNote && <p className="mt-2 text-sm text-amber-900">قرار الإدارة: {order.dispute.resolutionNote}</p>}
            </div>
          )}

          {isCustomer && order.status === "PENDING_PAYMENT" && <Link href={"/orders/" + order.id + "/payment"} className="mt-7 block rounded-xl bg-orange-500 px-6 py-4 text-center font-black text-white">الانتقال إلى الدفع</Link>}
          {isProvider && <p className="mt-7 rounded-xl bg-blue-50 p-4 text-sm leading-7 text-blue-800">بيانات تواصل العميل مخفية عنك. ابدأ التنفيذ بعد اعتماد التحويل فقط. المبلغ يظل محجوزًا محاسبيًا ولا يوجد صرف تلقائي.</p>}
          <OrderWorkflowActions orderId={order.id} role={user.role} orderStatus={order.status} escrowStatus={order.escrow?.status ?? null} />
        </div>
      </section>
    </main>
  );
}
