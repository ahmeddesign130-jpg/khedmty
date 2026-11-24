import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function markAllRead() {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await prisma.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/notifications");
}

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const notifications = await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 });
  const unread = notifications.filter((item) => !item.readAt).length;
  return <main dir="rtl" className="min-h-screen bg-slate-50 p-4 md:p-8"><section className="mx-auto max-w-3xl">
    <Link href="/" className="font-bold text-orange-600">← الصفحة الرئيسية</Link>
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-black text-slate-900">الإشعارات</h1><p className="mt-2 text-sm text-slate-500">متابعة تحديثات الدفع والطلبات.</p></div>
    {unread > 0 && <form action={markAllRead}><button className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white">تحديد الكل كمقروء</button></form>}</div>
    {notifications.length === 0 ? <p className="mt-7 rounded-2xl bg-white p-8 text-center text-slate-500">لا توجد إشعارات حتى الآن.</p> : <div className="mt-6 space-y-3">{notifications.map((item) => <article key={item.id} className={"rounded-2xl border bg-white p-5 shadow-sm " + (item.readAt ? "border-slate-100" : "border-orange-200")}>
      <div className="flex items-start justify-between gap-3"><h2 className="font-black text-slate-900">{item.title}</h2>{!item.readAt && <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-bold text-orange-700">جديد</span>}</div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">{item.body}</p>
      <div className="mt-4 flex items-center justify-between gap-3"><time className="text-xs text-slate-400">{item.createdAt.toLocaleString("en-GB")}</time>{item.href && <Link href={item.href} className="text-sm font-bold text-orange-600">فتح التفاصيل ←</Link>}</div>
    </article>)}</div>}
  </section></main>;
}
