import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  PENDING_PAYMENT: "في انتظار الدفع",
  PAYMENT_REVIEW: "مراجعة الدفع",
  PAID: "تم الدفع",
  IN_PROGRESS: "قيد التنفيذ",
  DELIVERED: "تم التسليم",
  REVISION_REQUESTED: "مطلوب تعديل",
  COMPLETED: "أكد العميل الاستلام",
  DISPUTED: "نزاع قيد المراجعة",
  REFUNDED: "تم تسجيل الاسترداد",
  CANCELLED: "ملغي",
  REJECTED: "مرفوض",
};
const escrowLabels: Record<string, string> = {
  HELD: "محجوز محاسبيًا",
  DISPUTED: "متوقف بسبب نزاع",
  RELEASED: "تم تسجيل الصرف اليدوي",
  REFUNDED: "تم تسجيل الاسترداد اليدوي",
};

export default async function AdminOrdersPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPER_ADMIN" || user.status !== "ACTIVE") redirect("/login");

  const orders = await prisma.order.findMany({
    include: {
      customer: { select: { displayName: true, email: true } },
      provider: { select: { displayName: true, email: true } },
      payments: true,
      escrow: { select: { status: true, amount: true } },
      dispute: { select: { id: true, status: true, reason: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const serviceRecords = await prisma.service.findMany({
    where: { id: { in: [...new Set(orders.map((order) => order.serviceId))] } },
    select: { id: true, title: true, serviceNo: true },
  });
  const serviceById = new Map(serviceRecords.map((service) => [service.id, service]));
  const money = (amount: number) => amount.toLocaleString("en-US") + " EG";

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/admin" className="mb-6 inline-block text-sm font-bold text-orange-600">← العودة للوحة الإدارة</Link>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-black text-slate-900">إدارة الطلبات</h1><p className="mt-2 text-slate-500">متابعة جميع طلبات العملاء ومقدمي الخدمات</p></div><Link href="/admin/escrow" className="rounded-xl bg-[#14213d] px-4 py-3 text-sm font-bold text-white">الحجز المحاسبي والنزاعات</Link></div>

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">إجمالي الطلبات</p><p className="mt-2 text-2xl font-black">{orders.length}</p></div>
          <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">في انتظار الدفع</p><p className="mt-2 text-2xl font-black text-orange-600">{orders.filter((order) => order.status === "PENDING_PAYMENT").length}</p></div>
          <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">قيد التنفيذ</p><p className="mt-2 text-2xl font-black text-blue-600">{orders.filter((order) => order.status === "IN_PROGRESS").length}</p></div>
          <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">نزاعات</p><p className="mt-2 text-2xl font-black text-amber-700">{orders.filter((order) => order.status === "DISPUTED").length}</p></div>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm"><p className="text-lg font-bold text-slate-700">لا توجد طلبات حتى الآن</p></div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <section key={order.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4"><div><p className="text-xs text-slate-400">رقم الطلب</p><p className="mt-1 font-black text-slate-900">{order.orderNo}</p></div><span className="rounded-full bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700">{statusLabels[order.status] ?? order.status}</span></div>
                <div className="grid gap-5 py-5 md:grid-cols-2">
                  <div><p className="mb-2 text-sm font-bold text-slate-800">الخدمة</p><p className="text-sm text-slate-600">{serviceById.get(order.serviceId)?.title || "الخدمة"}</p><p className="mt-1 text-xs text-slate-400">رقم الخدمة للإدارة: {serviceById.get(order.serviceId)?.serviceNo || "غير متاح"}</p></div>
                  <div><p className="mb-2 text-sm font-bold text-slate-800">بيانات العميل</p><p className="text-sm text-slate-600">{order.customer.displayName}</p><p className="text-xs text-slate-400">{order.customer.email}</p><p className="mt-2 text-sm text-slate-600" dir="auto">وسيلة التواصل: {order.customerContact || "غير محددة"}</p></div>
                  <div><p className="mb-2 text-sm font-bold text-slate-800">مقدم الخدمة</p><p className="text-sm text-slate-600">{order.provider.displayName}</p><p className="text-xs text-slate-400">{order.provider.email}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-4">
                  <div><p className="text-xs text-slate-500">سعر الخدمة</p><p className="mt-1 font-bold text-slate-800">{money(order.servicePrice)}</p></div>
                  <div><p className="text-xs text-slate-500">عمولة المنصة</p><p className="mt-1 font-bold text-slate-800">{money(order.commission)}</p></div>
                  <div><p className="text-xs text-slate-500">الإجمالي</p><p className="mt-1 font-black text-orange-600">{money(order.total)}</p></div>
                  <div><p className="text-xs text-slate-500">عمليات الدفع</p><p className="mt-1 font-bold text-slate-800">{order.payments.length}</p></div>
                </div>
                {order.escrow && <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm"><p className="font-black text-orange-950">حالة المبلغ: {escrowLabels[order.escrow.status]}</p><p className="mt-1 text-orange-900">القيمة المسجلة محاسبيًا: {money(order.escrow.amount)}. لا يوجد حساب ضمان منفصل أو صرف تلقائي.</p></div>}
                {order.dispute && <div className="mt-3 rounded-xl bg-amber-50 p-4 text-sm"><p className="font-black text-amber-900">النزاع: {order.dispute.status === "OPEN" ? "مفتوح" : order.dispute.status === "UNDER_REVIEW" ? "قيد المراجعة" : "تم الحسم"}</p><p className="mt-2 whitespace-pre-wrap">{order.dispute.reason}</p></div>}
                <div className="mt-4 flex flex-wrap gap-3"><Link href={"/orders/" + order.id} className="text-sm font-bold text-orange-600">تفاصيل الطلب</Link>{order.escrow && <Link href="/admin/escrow" className="text-sm font-bold text-[#14213d]">السجل المحاسبي</Link>}</div>
                <div className="mt-4 text-xs text-slate-400">تاريخ الطلب: {new Date(order.createdAt).toLocaleString("en-GB")}</div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
