import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  PENDING_PAYMENT: "في انتظار الدفع",
  PAYMENT_REVIEW: "الدفع قيد المراجعة",
  PAID: "تم تأكيد الدفع",
  IN_PROGRESS: "جاري تنفيذ الطلب",
  DELIVERED: "تم تسليم الخدمة",
  REVISION_REQUESTED: "مطلوب تعديل",
  COMPLETED: "مكتمل",
  CANCELLED: "ملغي",
  REJECTED: "مرفوض",
};

export default async function OrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: {
        select: { id: true, displayName: true },
      },
      provider: {
        select: { id: true, displayName: true },
      },
      payments: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!order) notFound();

  const isAdmin = user.role === "SUPER_ADMIN";
  const isCustomer = order.customerId === user.id;
  const isProvider = order.providerId === user.id;

  if (!isAdmin && !isCustomer && !isProvider) {
    redirect("/account");
  }

  const service = await prisma.service.findUnique({
    where: { id: order.serviceId },
    select: { title: true, serviceNo: true },
  });

  const latestPayment = order.payments[0];

  return (
    <main dir="rtl" className="min-h-screen bg-[#f5f6f8]">
      <header className="bg-[#14213d] px-5 py-5 text-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/" className="text-2xl font-black text-orange-400">
            خِدمتي
          </Link>
          <Link href="/account" className="font-bold">
            حسابي
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-5 py-10">
        <Link href="/services" className="font-bold text-orange-600">
          ← العودة للخدمات
        </Link>

        <div className="mt-6 rounded-3xl bg-white p-6 shadow-sm md:p-9">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-black text-[#14213d]">
              تفاصيل الطلب
            </h1>
            <span className="rounded-xl bg-orange-50 px-4 py-2 text-sm font-bold text-orange-700">
              {statusLabels[order.status] || order.status}
            </span>
          </div>

          <div className="mt-7 rounded-2xl bg-slate-50 p-5">
            <p className="text-sm text-slate-500">رقم الطلب</p>
            <p className="mt-2 text-xl font-black text-[#14213d]">
              {order.orderNo}
            </p>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <p className="text-sm text-slate-500">الخدمة</p>
              <p className="mt-1 font-bold text-[#14213d]">
                {service?.title || "الخدمة"}
              </p>
              {service && (
                <p className="mt-1 text-xs text-slate-500">
                  رقم الخدمة: {service.serviceNo}
                </p>
              )}
            </div>

            <div>
              <p className="text-sm text-slate-500">العميل</p>
              <p className="mt-1 font-bold text-[#14213d]">
                {order.customer.displayName}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">مقدم الخدمة</p>
              <p className="mt-1 font-bold text-[#14213d]">
                {order.provider.displayName}
              </p>
            </div>
          </div>

          <div className="mt-7 rounded-2xl bg-[#14213d] p-6 text-white">
            <h2 className="text-lg font-black">ملخص المبلغ</h2>

            <div className="mt-5 space-y-4 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-slate-300">سعر الخدمة</span>
                <span className="font-bold">
                  {order.servicePrice.toLocaleString("en-US")} EG
                </span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-slate-300">
                  عمولة المنصة ({order.commissionRate}%)
                </span>
                <span className="font-bold">
                  {order.commission.toLocaleString("en-US")} EG
                </span>
              </div>

              <div className="flex justify-between border-t border-white/20 pt-4">
                <span className="font-bold">الإجمالي</span>
                <span className="text-2xl font-black text-orange-400">
                  {order.total.toLocaleString("en-US")} EG
                </span>
              </div>
            </div>
          </div>

          {latestPayment && (
            <div className="mt-6 rounded-2xl border border-slate-200 p-5">
              <h2 className="font-black text-[#14213d]">
                آخر عملية دفع
              </h2>
              <p className="mt-3 text-sm text-slate-600">
                الحالة: {statusLabels[latestPayment.status] || latestPayment.status}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                المبلغ: {latestPayment.amount.toLocaleString("en-US")} EG
              </p>
            </div>
          )}

          {isCustomer && order.status === "PENDING_PAYMENT" && (
            <Link
              href={`/orders/${order.id}/payment`}
              className="mt-7 block rounded-xl bg-orange-500 px-6 py-4 text-center font-black text-white transition hover:bg-orange-600"
            >
              الانتقال إلى الدفع
            </Link>
          )}

          {isProvider && (
            <p className="mt-7 rounded-xl bg-blue-50 p-4 text-sm leading-7 text-blue-800">
              يمكنك متابعة حالة الطلب من حساب مقدم الخدمة.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
