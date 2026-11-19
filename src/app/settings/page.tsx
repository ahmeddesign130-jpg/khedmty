import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UiIcon } from "@/components/ui-icon";
import { AppearanceLanguageControls } from "@/components/appearance-language-controls";

export default async function SettingsPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { email: true, displayName: true, role: true },
  });
  if (!user) redirect("/login");

  const roleLabel = user.role === "SUPER_ADMIN" ? "مدير المنصة" : user.role === "PROVIDER" ? "مقدم خدمة" : "عميل";

  return <main dir="rtl" className="min-h-screen bg-[#f7f8fa]">
    <header className="bg-white shadow-sm">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-5">
        <Link href="/" className="text-2xl font-black text-orange-500">خِدمتي</Link>
        <Link href={user.role === "SUPER_ADMIN" ? "/admin" : user.role === "PROVIDER" ? "/provider" : "/account"} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 font-bold text-[#14213d]"><UiIcon name="arrow-left" size={18}/> العودة للوحة التحكم</Link>
      </div>
    </header>
    <section className="mx-auto max-w-4xl px-5 py-10">
      <div className="rounded-3xl bg-[#14213d] p-7 text-white shadow-lg">
        <span className="ui-icon-tile ui-icon-tile-dark"><UiIcon name="settings" size={28}/></span>
        <p className="mt-4 text-orange-300">تحكم في تفضيلاتك</p>
        <h1 className="mt-2 text-3xl font-black">الإعدادات</h1>
        <p className="mt-3 leading-8 text-slate-300">إعدادات الحساب واللغة في مكان واحد.</p>
      </div>
      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <span className="ui-icon-tile"><UiIcon name="user-cog" size={26}/></span>
          <h2 className="mt-4 text-xl font-black text-[#14213d]">إعدادات الحساب</h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">بيانات الحساب المسجل حاليًا.</p>
          <div className="mt-5 space-y-3 text-sm">
            <div className="rounded-xl bg-slate-50 p-3"><span className="block text-xs text-slate-500">الاسم</span><strong className="mt-1 block">{user.displayName}</strong></div>
            <div className="rounded-xl bg-slate-50 p-3"><span className="block text-xs text-slate-500">البريد الإلكتروني</span><strong dir="ltr" className="mt-1 block text-left">{user.email}</strong></div>
            <div className="rounded-xl bg-slate-50 p-3"><span className="block text-xs text-slate-500">نوع الحساب</span><strong className="mt-1 block">{roleLabel}</strong></div>
          </div>
        </section>
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <span className="ui-icon-tile"><UiIcon name="languages" size={26}/></span>
          <h2 className="mt-4 text-xl font-black text-[#14213d]">اللغة</h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">لغة عرض الموقع وواجهات الحساب.</p>
          <div className="mt-5 flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50 p-4">
            <span className="inline-flex items-center gap-3 font-bold text-[#14213d]"><UiIcon name="globe" size={21}/> العربية</span>
            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-700">مفعّلة</span>
          </div>
          <p className="mt-3 text-xs leading-6 text-slate-500">خِدمتي متاحة حاليًا باللغة العربية، وسيتم إضافة لغات أخرى عند تجهيز واجهاتها بالكامل.</p>
        </section>
      </div>
    </section>
  </main>;
}
