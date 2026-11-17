import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const labels: Record<string,string> = {
  PENDING_PAYMENT:"في انتظار الدفع", PAYMENT_REVIEW:"مراجعة الدفع", PAID:"تم الدفع",
  IN_PROGRESS:"قيد التنفيذ", DELIVERED:"تم التسليم", REVISION_REQUESTED:"مطلوب تعديل",
  COMPLETED:"مكتمل", CANCELLED:"ملغي", REJECTED:"مرفوض"
};

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "SUPER_ADMIN") redirect("/admin");
  if (user.role === "PROVIDER") redirect("/provider/orders");
  const orders = await prisma.order.findMany({
    where: { customerId: user.id },
    orderBy: { createdAt: "desc" },
    include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } }
  });
  return <main dir="rtl" className="min-h-screen bg-slate-50 p-5 md:p-9">
    <div className="mx-auto max-w-4xl">
      <Link href="/account" className="font-bold text-orange-600">← حسابي</Link>
      <h1 className="mt-5 text-3xl font-black text-slate-900">طلباتي</h1>
      <p className="mt-2 text-slate-500">تابع حالة مشترياتك ومدفوعاتك من هنا.</p>
      {orders.length === 0 ? <section className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">
        <h2 className="text-xl font-bold">لسه مفيش طلبات</h2>
        <Link href="/services" className="mt-5 inline-block rounded-xl bg-orange-500 px-6 py-3 font-bold text-white">تصفح الخدمات</Link>
      </section> : <div className="mt-7 space-y-4">{orders.map(order => <article key={order.id} className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3"><strong>{order.orderNo}</strong><span className="rounded-full bg-orange-50 px-3 py-2 text-sm font-bold text-orange-700">{labels[order.status] || order.status}</span></div>
        <p className="mt-4 text-sm text-slate-500">الإجمالي</p><p className="mt-1 text-xl font-black text-orange-600">{order.total.toLocaleString("en-US")} EG</p>
        <Link href={`/orders/${order.id}`} className="mt-4 inline-block rounded-xl bg-[#14213d] px-5 py-3 font-bold text-white">تفاصيل الطلب</Link>
      </article>)}</div>}
    </div>
  </main>;
}
