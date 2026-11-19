"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [locale, setLocale] = useState<Locale>("ar");
  const [theme, setTheme] = useState<Theme>("light");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); return; }
      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) { event.preventDefault(); return; }
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => { window.removeEventListener("keydown", onKeyDown); triggerRef.current?.focus(); };
  }, [open]);

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
          className="khedmty-menu-trigger fixed right-3 top-3 z-[50] inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-[0_8px_24px_rgba(234,105,24,0.32)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:from-orange-600 hover:to-orange-700 hover:shadow-[0_12px_28px_rgba(234,105,24,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400">
          <UiIcon name="menu" size={26} strokeWidth={2.5} />
        </button>
      )}
      {open && <button type="button" aria-label={locale === "en" ? "Close menu" : "إغلاق القائمة"} onClick={() => setOpen(false)} className="khedmty-menu-backdrop fixed inset-0 z-[80] cursor-default bg-[#14213d]/40 backdrop-blur-[3px]" />}
      <aside ref={drawerRef} role="dialog" aria-modal="true" inert={!open} id="khedmty-side-menu" dir={locale === "en" ? "ltr" : "rtl"} aria-label={locale === "en" ? "Main menu" : "القائمة الرئيسية"} aria-hidden={!open}
        data-open={open ? "true" : "false"}
        className="khedmty-side-drawer fixed top-0 z-[90] flex h-[100dvh] w-[min(88vw,360px)] flex-col overflow-y-auto border-slate-100/80 bg-white p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-100 pb-5">
          <div className="min-w-0">
            <p className="whitespace-nowrap text-2xl font-black leading-tight tracking-normal text-[#14213d]">خِدمتي</p>
            <p className="mt-1 whitespace-nowrap text-xs text-slate-500">القائمة الرئيسية</p>
          </div>
          <button ref={closeRef} type="button" onClick={() => setOpen(false)} aria-label={locale === "en" ? "Close menu" : "إغلاق القائمة"} className="ios-icon-glass relative z-[100] h-10 w-10 shrink-0 cursor-pointer touch-manipulation text-slate-600 hover:bg-orange-50" style={{ pointerEvents: "auto" }}><UiIcon name="x" size={22} /></button>
        </div>

        <nav aria-label={locale === "en" ? "Page navigation" : "التنقل بين الصفحات"} className="flex flex-col gap-2">
          {links.map((item) => (
            <a key={item.href} href={item.href} onClick={() => setOpen(false)}
              aria-current={pathname === item.href ? "page" : undefined}
              className={`glassy-nav-tab flex min-h-14 w-full min-w-0 items-center gap-3 rounded-2xl px-3 py-3 text-start font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${pathname === item.href ? "is-active" : ""}`}>
              <span className="glassy-nav-icon h-11 w-11 shrink-0"><UiIcon name={item.icon} size={21} strokeWidth={2.2} /></span>
              <span className="min-w-0 flex-1 truncate leading-6">{item.label}</span>
              <span className="shrink-0 text-slate-300"><UiIcon name="chevron-left" size={17} /></span>
            </a>
          ))}
        </nav>

        <section className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="mb-3 flex items-center gap-2 font-black text-[#14213d]"><UiIcon name="settings" size={19} /> اللغة والمظهر</div>
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
          <button type="submit" className="flex min-h-12 w-full min-w-0 items-center gap-3 rounded-xl px-3 py-3 text-start font-bold text-red-600 transition hover:bg-red-50">
            <span className="ios-icon-glass h-10 w-10 shrink-0 text-red-500"><UiIcon name="log-out" size={20} /></span><span className="min-w-0 flex-1">تسجيل الخروج</span>
          </button>
        </form>}
      </aside>
    </>
  );
}
