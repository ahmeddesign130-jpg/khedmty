import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UiIcon } from "@/components/ui-icon";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "SUPER_ADMIN") redirect("/admin");
  if (user.role === "PROVIDER") { if (user.status === "PENDING") redirect("/pending"); redirect("/provider"); }

  return <main dir="rtl" className="min-h-screen bg-[#f7f8fa]">
    <header className="bg-white shadow-sm"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
      <Link href="/" className="text-2xl font-black text-orange-500">خِدمتي</Link>
      <div className="flex items-center gap-2"><a href="/settings" aria-label="الإعدادات" title="الإعدادات" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 font-bold text-[#14213d] hover:bg-orange-50"><UiIcon name="settings" size={19}/><span className="hidden sm:inline">الإعدادات</span></a><form action="/api/auth/logout" method="POST"><button className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-bold"><UiIcon name="log-out" size={18}/> تسجيل الخروج</button></form></div>
    </div></header>
    <section className="mx-auto max-w-6xl px-5 py-12">
      <div className="relative overflow-hidden rounded-3xl bg-[#14213d] p-8 text-white shadow-xl">
        <div className="absolute -left-12 -top-16 h-48 w-48 rounded-full bg-orange-500/20 blur-3xl"/>
        <div className="relative"><span className="ui-icon-tile ui-icon-tile-dark"><UiIcon name="user" size={28}/></span>
          <p className="mt-4 text-orange-300">مرحبًا بك في خِدمتي</p><h1 className="mt-2 text-3xl font-black">حساب العميل</h1>
          <p className="mt-3 text-gray-300">تابع مشترياتك ومدفوعاتك، واوصل للخدمة اللي تناسب احتياجك من حساب واحد.</p>
        </div>
      </div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <Link href="/services" className="group rounded-2xl border border-gray-100 bg-white p-7 shadow-sm">
          <span className="ui-icon-tile"><UiIcon name="search" size={27}/></span><h2 className="mt-5 text-xl font-black">تصفح الخدمات</h2>
          <p className="mt-3 text-gray-500">دوّر على الخدمة باسمها أو نوعها، وقارن التفاصيل قبل ما تختار.</p>
          <span className="mt-5 inline-flex items-center gap-2 font-bold text-orange-500">استكشف الخدمات <UiIcon name="arrow-left" size={17}/></span>
        </Link>
        <Link href="/orders" className="group rounded-2xl border border-gray-100 bg-white p-7 shadow-sm">
          <span className="ui-icon-tile"><UiIcon name="shopping-bag" size={27}/></span><h2 className="mt-5 text-xl font-black">طلباتي</h2>
          <p className="mt-3 text-gray-500">اعرف كل طلب وصل لفين، وراجع تفاصيله ومدفوعاته في أي وقت.</p>
          <span className="mt-5 inline-flex items-center gap-2 font-bold text-orange-500">عرض الطلبات <UiIcon name="arrow-left" size={17}/></span>
        </Link>
      </div>
    </section>
  </main>;
}
