"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UiIcon } from "@/components/ui-icon";

type Role = "CUSTOMER" | "PROVIDER" | "SUPER_ADMIN";
type Locale = "ar" | "en";
type Theme = "light" | "dark";

const items: Record<Role, { href: string; label: string; icon: "search" | "clipboard-list" | "settings" | "grid" | "briefcase" | "users" | "badge-check" | "wallet" }[]> = {
  CUSTOMER: [
    { href: "/services", label: "السوق", icon: "search" },
    { href: "/orders", label: "طلباتي", icon: "clipboard-list" },
    { href: "/settings", label: "الإعدادات", icon: "settings" },
  ],
  PROVIDER: [
    { href: "/provider", label: "الرئيسية", icon: "grid" },
    { href: "/provider/services", label: "خدماتي", icon: "briefcase" },
    { href: "/provider/orders", label: "الطلبات", icon: "clipboard-list" },
    { href: "/settings", label: "الإعدادات", icon: "settings" },
  ],
  SUPER_ADMIN: [
    { href: "/admin", label: "لوحة الإدارة", icon: "grid" },
    { href: "/admin/providers", label: "مقدمو الخدمات", icon: "users" },
    { href: "/admin/services", label: "مراجعة الخدمات", icon: "badge-check" },
    { href: "/admin/orders", label: "الطلبات", icon: "clipboard-list" },
    { href: "/admin/payments", label: "المدفوعات", icon: "wallet" },
    { href: "/settings", label: "الإعدادات", icon: "settings" },
  ],
};

export function SideNavigation({ role, userId }: { role: Role | null; userId: string }) {
  const [open, setOpen] = useState(false);
  const [locale, setLocale] = useState<Locale>("ar");
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("khedmty-preferences-" + userId) || "{}");
      const nextLocale: Locale = saved.locale === "en" ? "en" : "ar";
      const nextTheme: Theme = saved.theme === "dark" ? "dark" : "light";
      setLocale(nextLocale);
      setTheme(nextTheme);
      document.documentElement.lang = nextLocale;
      document.documentElement.dir = nextLocale === "ar" ? "rtl" : "ltr";
      document.documentElement.dataset.locale = nextLocale;
      document.documentElement.dataset.theme = nextTheme;
    } catch {}
  }, [userId]);

  function savePreferences(nextLocale: Locale, nextTheme: Theme) {
    setLocale(nextLocale);
    setTheme(nextTheme);
    const value = JSON.stringify({ locale: nextLocale, theme: nextTheme });
    try {
      localStorage.setItem("khedmty-preferences-" + userId, value);
      localStorage.setItem("khedmty-public-preferences", value);
    } catch {}
    document.documentElement.lang = nextLocale;
    document.documentElement.dir = nextLocale === "ar" ? "rtl" : "ltr";
    document.documentElement.dataset.locale = nextLocale;
    document.documentElement.dataset.theme = nextTheme;
    window.dispatchEvent(new Event("khedmty-preferences-change"));
  }

  const links = role ? items[role] : [
    { href: "/", label: "الرئيسية", icon: "grid" as const },
    { href: "/login", label: "تسجيل الدخول", icon: "users" as const },
    { href: "/register", label: "إنشاء حساب", icon: "badge-check" as const },
  ];

  return (
    <>
      {!open && (
        <button type="button" aria-label="فتح قائمة خِدمتي" aria-expanded={false} aria-controls="khedmty-side-menu"
          onClick={() => setOpen(true)}
          className="fixed right-3 top-3 z-[70] inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/95 text-[#14213d] shadow-lg backdrop-blur-xl transition hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
          <UiIcon name="menu" size={24} />
        </button>
      )}
      {open && <button type="button" aria-label="إغلاق القائمة" onClick={() => setOpen(false)} className="fixed inset-0 z-[60] cursor-default bg-[#14213d]/40 backdrop-blur-[3px]" />}
      <aside id="khedmty-side-menu" dir="rtl" aria-label="القائمة الرئيسية" aria-hidden={!open}
        className={`fixed right-0 top-0 z-[65] flex h-[100dvh] w-[min(88vw,360px)] flex-col overflow-y-auto border-l border-slate-100/80 bg-white p-5 shadow-2xl transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-100 pb-5">
          <div className="min-w-0">
            <p className="whitespace-nowrap text-2xl font-black leading-tight tracking-normal text-[#14213d]">خِدمتي</p>
            <p className="mt-1 whitespace-nowrap text-xs text-slate-500">القائمة الرئيسية</p>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق القائمة" className="ios-icon-glass h-10 w-10 shrink-0 text-slate-600 hover:bg-orange-50"><UiIcon name="x" size={22} /></button>
        </div>

        <nav className="flex flex-col gap-2">
          {links.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
              className="flex min-h-12 items-center gap-4 rounded-xl px-4 py-3 font-bold text-[#14213d] transition hover:bg-orange-50 hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
              <span className="ios-icon-glass h-10 w-10"><UiIcon name={item.icon} size={20} /></span>
              <span>{item.label}</span>
              <span className="mr-auto text-slate-300"><UiIcon name="chevron-left" size={17} /></span>
            </Link>
          ))}
        </nav>

        <section className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="mb-3 flex items-center gap-2 font-black text-[#14213d]"><UiIcon name="sliders-horizontal" size={19} /> اللغة والمظهر</div>
          <p className="mb-2 text-xs font-bold text-slate-500">لغة الموقع</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" aria-pressed={locale === "ar"} onClick={() => savePreferences("ar", theme)} className={`menu-preference-button ${locale === "ar" ? "is-active" : ""}`}><UiIcon name="languages" size={17}/> العربية</button>
            <button type="button" aria-pressed={locale === "en"} onClick={() => savePreferences("en", theme)} className={`menu-preference-button ${locale === "en" ? "is-active" : ""}`}><UiIcon name="globe" size={17}/> English</button>
          </div>
          <p className="mb-2 mt-4 text-xs font-bold text-slate-500">مظهر الموقع</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" aria-pressed={theme === "light"} onClick={() => savePreferences(locale, "light")} className={`menu-preference-button ${theme === "light" ? "is-active" : ""}`}><UiIcon name="sun" size={17}/> فاتح</button>
            <button type="button" aria-pressed={theme === "dark"} onClick={() => savePreferences(locale, "dark")} className={`menu-preference-button ${theme === "dark" ? "is-active" : ""}`}><UiIcon name="moon" size={17}/> داكن</button>
          </div>
        </section>

        {role && <form action="/api/auth/logout" method="POST" className="mt-auto border-t border-slate-100 pt-4">
          <button type="submit" className="flex min-h-12 w-full items-center gap-4 rounded-xl px-4 py-3 font-bold text-red-600 transition hover:bg-red-50">
            <span className="ios-icon-glass h-10 w-10 text-red-500"><UiIcon name="log-out" size={20} /></span> تسجيل الخروج
          </button>
        </form>}
      </aside>
    </>
  );
}
