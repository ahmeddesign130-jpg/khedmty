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
  const [completedCount, orders] = await Promise.all([
    prisma.order.count({ where: { customerId: user.id, status: "COMPLETED" } }),
    prisma.order.findMany({
      where: { customerId: user.id },
      orderBy: { createdAt: "desc" },
      include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } },
    }),
  ]);
  const services = await prisma.service.findMany({
    where: { id: { in: [...new Set(orders.map((order) => order.serviceId))] } },
    select: { id: true, title: true },
  });
  const serviceTitles = new Map(services.map((service) => [service.id, service.title]));
  const capacity = 5 + Math.floor(completedCount / 5) * 5;
  const progress = completedCount % 5 === 0 && completedCount > 0 ? 5 : completedCount % 5;
  const activeCount = orders.filter(order => !["COMPLETED", "CANCELLED", "REJECTED"].includes(order.status)).length;
  return <main dir="rtl" className="min-h-screen bg-slate-50 p-5 md:p-9">
    <div className="mx-auto max-w-4xl">
      <Link href="/account" className="font-bold text-orange-600">← حسابي</Link>
      <h1 className="mt-5 text-3xl font-black text-slate-900">طلباتي</h1>
      <p className="mt-2 text-slate-500">كل طلباتك في مكان واحد: تابع التنفيذ، راجع الدفع، واعرف الخطوة الجاية.</p>
      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-black text-[#14213d]">تقدمك في خِدمتي</p><p className="mt-1 text-sm text-slate-500">أنجزت {completedCount.toLocaleString("en-US")} طلبات مكتملة — سعتك الحالية {capacity.toLocaleString("en-US")} أماكن</p></div><strong className="text-orange-600">{progress.toLocaleString("en-US")} من 5</strong></div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-orange-500" style={{width:`${(progress/5)*100}%`}}/></div>
        <p className="mt-3 text-xs text-slate-500">لإنشاء طلب جديد يجب أن يتوفر مكان. أكمل طلبًا جاريًا ليتحرر مكان، وكل 5 طلبات مكتملة تزيد سعتك الدائمة 5 أماكن.</p>
        <p className="mt-1 text-xs text-slate-500">الأماكن المستخدمة حاليًا: {activeCount.toLocaleString("en-US")} من {capacity.toLocaleString("en-US")}</p>
      </section>
      {orders.length === 0 ? <section className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">
        <h2 className="text-xl font-bold">لسه ما طلبتش خدمة؟ ابدأ باكتشاف الخدمات المناسبة ليك.</h2>
        <a href="/services" className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-orange-600 px-6 py-3 font-bold text-white shadow-sm transition hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400">تصفح الخدمات</a>
      </section> : <div className="mt-7 space-y-4">{orders.map(order => <article key={order.id} className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><strong>{order.orderNo}</strong><p className="mt-1 text-sm text-slate-500">{serviceTitles.get(order.serviceId) || "الخدمة"}</p><p className="mt-1 text-xs text-slate-400">{order.createdAt.toLocaleDateString("en-GB")}</p></div><span className="rounded-full bg-orange-50 px-3 py-2 text-sm font-bold text-orange-700">{labels[order.status] || order.status}</span></div>
        <p className="mt-4 text-sm text-slate-500">الإجمالي</p><p className="mt-1 text-xl font-black text-orange-600">{order.total.toLocaleString("en-US")} EG</p>
        <Link href={`/orders/${order.id}`} className="mt-4 inline-block rounded-xl bg-[#14213d] px-5 py-3 font-bold text-white">تفاصيل الطلب</Link>
      </article>)}</div>}
    </div>
  </main>;
}
