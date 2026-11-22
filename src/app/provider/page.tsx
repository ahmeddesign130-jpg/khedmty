import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { UiIcon } from "@/components/ui-icon";

export default async function ProviderPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "SUPER_ADMIN") redirect("/admin");
  if (user.role !== "PROVIDER") redirect("/account");
  if (user.status === "PENDING") redirect("/pending");
  if (user.status === "SUSPENDED") redirect("/login?error=suspended");

  return <main dir="rtl" className="min-h-screen bg-[#f7f8fa]">
    <header className="bg-white shadow-sm"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
      <Link href="/" className="text-2xl font-black text-orange-500">خِدمتي</Link>
      <div className="flex items-center gap-2"><Link href="/settings" aria-label="الإعدادات" title="الإعدادات" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 font-bold text-[#14213d] hover:bg-orange-50"><UiIcon name="settings" size={19}/><span className="hidden sm:inline">الإعدادات</span></Link><form action="/api/auth/logout" method="POST"><button className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-bold"><UiIcon name="log-out" size={18}/> تسجيل الخروج</button></form>
    </div></div></header>
    <section className="mx-auto max-w-6xl px-5 py-12">
      <div className="rounded-3xl bg-[#14213d] p-8 text-white shadow-xl">
        <span className="ui-icon-tile ui-icon-tile-dark"><UiIcon name="briefcase" size={28}/></span>
        <p className="mt-4 text-orange-300">مساحة مقدم الخدمة</p><h1 className="mt-2 text-3xl font-black">أهلاً بك في خِدمتي</h1>
        <p className="mt-3 text-gray-300">حوّل مهارتك لخدمة واضحة، وتابع طلبات العملاء والتنفيذ والتسليم من مكان واحد.</p>
      </div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <Link href="/provider/services" className="rounded-2xl bg-white p-7 shadow-sm"><span className="ui-icon-tile"><UiIcon name="briefcase" size={27}/></span><h2 className="mt-5 text-xl font-black">خدماتي</h2><p className="mt-3 text-gray-500">جهّز عرضك، حدّث تفاصيله، وتابع قرار المراجعة أولًا بأول.</p><span className="mt-5 inline-flex items-center gap-2 font-bold text-orange-500">إدارة الخدمات <UiIcon name="arrow-left" size={17}/></span></Link>
        <Link href="/provider/store" className="rounded-2xl bg-white p-7 shadow-sm"><span className="ui-icon-tile"><UiIcon name="wallet" size={27}/></span><h2 className="mt-5 text-xl font-black">متجري الرقمي</h2><p className="mt-3 text-gray-500">أنشئ متجرًا خاصًا بك، وارفع الملفات الرقمية وتابع المبيعات وصافي مستحقاتك.</p><span className="mt-5 inline-flex items-center gap-2 font-bold text-orange-500">إدارة المتجر <UiIcon name="arrow-left" size={17}/></span></Link>
        <Link href="/provider/orders" className="rounded-2xl bg-white p-7 shadow-sm"><span className="ui-icon-tile"><UiIcon name="clipboard-list" size={27}/></span><h2 className="mt-5 text-xl font-black">طلبات العملاء</h2><p className="mt-3 text-gray-500">اعرف الطلبات الجديدة، ونظّم شغلك، وتابع كل مرحلة لحد التسليم.</p><span className="mt-5 inline-flex items-center gap-2 font-bold text-orange-500">عرض الطلبات <UiIcon name="arrow-left" size={17}/></span></Link>
        <Link href="/provider/services" className="rounded-2xl bg-white p-6 shadow-sm"><span className="ui-icon-tile"><UiIcon name="plus-circle" size={25}/></span><h2 className="mt-4 font-black">أضف خدمة جديدة</h2><p className="mt-2 text-sm text-gray-500">قدّم خدمتك بشكل احترافي، وبعد المراجعة تظهر للعملاء.</p></Link>
        <Link href="/provider/orders" className="rounded-2xl bg-white p-6 shadow-sm"><span className="ui-icon-tile"><UiIcon name="chart" size={25}/></span><h2 className="mt-4 font-black">متابعة الأداء</h2><p className="mt-2 text-sm text-gray-500">راجع الطلبات الجارية والمنجزة.</p></Link>
      </div>
    </section>
  </main>;
}
