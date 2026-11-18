import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { UiIcon } from "@/components/ui-icon";

const sections = [
  { title:"مراجعة مقدمي الخدمات", description:"مراجعة الحسابات الجديدة والموافقة عليها أو رفضها.", href:"/admin/providers", icon:"users" as const, hint:"اعتماد الحسابات" },
  { title:"مراجعة الخدمات", description:"مراجعة الخدمات المقدمة قبل ظهورها للعملاء.", href:"/admin/services", icon:"badge-check" as const, hint:"فحص المحتوى" },
  { title:"إدارة الطلبات", description:"متابعة طلبات العملاء ومقدمي الخدمات.", href:"/admin/orders", icon:"clipboard-list" as const, hint:"متابعة التنفيذ" },
  { title:"مراجعة المدفوعات", description:"مراجعة إيصالات التحويل واعتماد المدفوعات.", href:"/admin/payments", icon:"wallet" as const, hint:"تأكيد التحويلات" },
  { title:"إعدادات المنصة", description:"إدارة نسبة العمولة وإعدادات خِدمتي.", href:"/admin/settings", icon:"settings" as const, hint:"التحكم بالمنصة" },
];

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "SUPER_ADMIN") redirect("/account");

  return <main dir="rtl" className="min-h-screen bg-[#f5f6f8]">
    <aside className="bg-[#14213d] text-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6">
      <Link href="/" className="text-3xl font-black text-orange-400">خِدمتي</Link>
      <span className="hidden items-center gap-2 text-sm text-slate-300 sm:inline-flex"><UiIcon name="shield" size={18}/> تحكم الإدارة</span>
      <form action="/api/auth/logout" method="POST"><button className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-4 py-2 text-sm font-bold"><UiIcon name="log-out" size={17}/> تسجيل الخروج</button></form>
    </div></aside>
    <section className="mx-auto max-w-7xl px-5 py-10">
      <div className="rounded-3xl bg-white p-8 shadow-sm"><span className="ui-icon-tile"><UiIcon name="shield" size={28}/></span>
        <p className="mt-4 font-bold text-orange-500">مركز التحكم</p><h1 className="mt-2 text-3xl font-black text-[#14213d]">لوحة إدارة خِدمتي</h1>
        <p className="mt-4 leading-8 text-gray-500">كل أدوات إدارة المنصة ومراجعة الحسابات والخدمات والطلبات والمدفوعات في مكان واحد.</p>
      </div>
      <h2 className="mb-5 mt-10 text-2xl font-black text-[#14213d]">أقسام الإدارة</h2>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => <Link key={section.href} href={section.href} className="rounded-2xl border border-gray-100 bg-white p-7 shadow-sm">
          <span className="ui-icon-tile"><UiIcon name={section.icon} size={28}/></span>
          <h3 className="mt-5 text-xl font-black text-[#14213d]">{section.title}</h3><p className="mt-3 leading-7 text-gray-500">{section.description}</p>
          <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-orange-500">{section.hint} <UiIcon name="arrow-left" size={17}/></span>
        </Link>)}
      </div>
    </section>
  </main>;
}
