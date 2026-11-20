import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { UiIcon } from "@/components/ui-icon";

const management = [
  { title: "مقدمو الخدمات", description: "راجع طلبات الانضمام واعتمد الحسابات أو ارفضها.", href: "/admin/providers", icon: "users" as const, action: "إدارة مقدمي الخدمات", tag: "الحسابات" },
  { title: "العملاء والحظر", description: "اعرض حسابات العملاء ومقدمي الخدمات وتحكم في الحظر وإعادة التفعيل.", href: "/admin/users", icon: "shield" as const, action: "إدارة الحسابات", tag: "الحسابات" },
  { title: "الخدمات", description: "افحص تفاصيل الخدمات والصور والأسعار قبل نشرها.", href: "/admin/services", icon: "badge-check" as const, action: "مراجعة الخدمات", tag: "المحتوى" },
  { title: "الطلبات", description: "تابع حالة الطلبات ومراحل تنفيذها بين الطرفين.", href: "/admin/orders", icon: "clipboard-list" as const, action: "فتح الطلبات", tag: "التشغيل" },
  { title: "المدفوعات", description: "راجع إثباتات التحويل وتأكد من المبالغ قبل الاعتماد.", href: "/admin/payments", icon: "wallet" as const, action: "مراجعة المدفوعات", tag: "المعاملات" },
  { title: "إعدادات المنصة", description: "تحكم في العمولة والخيارات الأساسية لخِدمتي.", href: "/admin/settings", icon: "settings" as const, action: "فتح الإعدادات", tag: "التحكم" },
];

const shortcuts = [
  { label: "مراجعة الحسابات", href: "/admin/providers", icon: "users" as const },
  { label: "فحص الخدمات", href: "/admin/services", icon: "search" as const },
  { label: "تأكيد التحويلات", href: "/admin/payments", icon: "badge-check" as const },
];

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "SUPER_ADMIN") redirect("/account");

  return (
    <main dir="rtl" className="min-h-screen bg-[#f5f6f8]">
      <header className="border-b border-white/10 bg-[#14213d] text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="brand-wordmark text-2xl font-black text-orange-400">خِدمتي</Link>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 sm:inline-flex"><UiIcon name="shield" size={16}/> مساحة الإدارة</span>
            <Link href="/settings" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/20 px-3 text-sm font-bold text-white hover:bg-white/10"><UiIcon name="settings" size={17}/><span className="hidden sm:inline">الإعدادات</span></Link>
            <form action="/api/auth/logout" method="POST"><button className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white/10 px-3 text-sm font-bold text-white hover:bg-white/20"><UiIcon name="log-out" size={17}/><span className="hidden sm:inline">خروج</span></button></form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
        <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#14213d] via-[#1c3153] to-[#263b5d] p-6 text-white shadow-xl sm:p-9">
          <div className="pointer-events-none absolute -left-12 -top-20 h-64 w-64 rounded-full bg-orange-400/10 blur-3xl"/>
          <div className="relative flex flex-col justify-between gap-7 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-orange-300/30 bg-orange-400/10 px-3 py-1.5 text-xs font-bold text-orange-200"><UiIcon name="grid" size={15}/> ADMIN DASHBOARD V2</span>
              <h1 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">مركز إدارة خِدمتي</h1>
              <p className="mt-3 max-w-xl text-sm leading-8 text-slate-200 sm:text-base">كل أدوات تشغيل المنصة في مكان واحد. راجع الحسابات والخدمات، وتابع الطلبات والمدفوعات، وتحكم في إعدادات السوق.</p>
            </div>
            <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-400 text-[#14213d]"><UiIcon name="shield" size={23}/></span>
              <div><p className="text-sm font-extrabold">وضع المسؤول</p><p className="mt-1 text-xs text-slate-300">صلاحيات إدارة المنصة</p></div>
            </div>
          </div>
        </section>
        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div><p className="text-xs font-extrabold tracking-wide text-orange-600">اختصارات سريعة</p><h2 className="mt-1 text-xl font-black text-[#14213d]">ابدأ من هنا</h2></div>
            <span className="text-xs font-medium text-slate-500">الوصول المباشر للمهام اليومية</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {shortcuts.map((item) => <Link key={item.href} href={item.href} className="group flex min-h-16 items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md">
              <span className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600"><UiIcon name={item.icon} size={20}/></span><span className="font-bold text-[#14213d]">{item.label}</span></span>
              <UiIcon name="arrow-left" size={18} className="text-slate-400 transition group-hover:-translate-x-1 group-hover:text-orange-600"/>
            </Link>)}
          </div>
        </section>
        <section className="mt-9">
          <div className="mb-4"><p className="text-xs font-extrabold tracking-wide text-orange-600">إدارة وتشغيل</p><h2 className="mt-1 text-xl font-black text-[#14213d]">أقسام لوحة التحكم</h2><p className="mt-1 text-sm leading-6 text-slate-500">اختر القسم المطلوب لإدارة تفاصيله ومراجعته.</p></div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {management.map((item) => <Link key={item.href} href={item.href} className="group flex min-h-52 flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-orange-300 hover:shadow-lg sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 transition group-hover:bg-orange-500 group-hover:text-white"><UiIcon name={item.icon} size={24}/></span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">{item.tag}</span>
              </div>
              <h3 className="mt-5 text-lg font-black text-[#14213d]">{item.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-7 text-slate-500">{item.description}</p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-extrabold text-orange-600">{item.action}<UiIcon name="arrow-left" size={17}/></span>
            </Link>)}
          </div>
        </section>
        <footer className="mt-9 flex flex-col justify-between gap-2 border-t border-slate-200 py-5 text-xs text-slate-500 sm:flex-row sm:items-center">
          <span>خِدمتي — مهارتك تستحق التميز</span><span>لوحة الإدارة · الإصدار الثاني</span>
        </footer>
      </div>
    </main>
  );
}
