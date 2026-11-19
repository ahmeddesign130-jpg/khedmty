"use client";

import { useEffect, useState } from "react";
import { UiIcon } from "@/components/ui-icon";

type Locale = "ar" | "en";
type Theme = "light" | "dark";

export function AppearanceLanguageControls({ userId }: { userId: string }) {
  const [locale, setLocale] = useState<Locale>("ar");
  const [theme, setTheme] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("khedmty-preferences-" + userId) || "{}") as { locale?: Locale; theme?: Theme };
      const nextLocale = saved.locale === "en" ? "en" : "ar";
      const nextTheme = saved.theme === "dark" ? "dark" : "light";
      setLocale(nextLocale);
      setTheme(nextTheme);
      document.documentElement.lang = nextLocale;
      document.documentElement.dir = nextLocale === "ar" ? "rtl" : "ltr";
      document.documentElement.dataset.theme = nextTheme;
    } catch {
      document.documentElement.lang = "ar";
      document.documentElement.dir = "rtl";
      document.documentElement.dataset.theme = "light";
    }
    setReady(true);
  }, [userId]);

  function save(nextLocale: Locale, nextTheme: Theme) {
    setLocale(nextLocale);
    setTheme(nextTheme);
    document.documentElement.lang = nextLocale;
    document.documentElement.dir = nextLocale === "ar" ? "rtl" : "ltr";
    document.documentElement.dataset.theme = nextTheme;
    try {
      localStorage.setItem("khedmty-preferences-" + userId, JSON.stringify({ locale: nextLocale, theme: nextTheme }));
    } catch {}
  }

  if (!ready) return null;
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="ui-icon-tile"><UiIcon name="languages" size={25} /></span>
        <div>
          <h2 className="text-xl font-black text-[#14213d]">اللغة والمظهر</h2>
          <p className="mt-1 text-sm text-slate-500">تفضيلات العرض محفوظة لهذا الحساب على هذا الجهاز.</p>
        </div>
      </div>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="khedmty-locale" className="mb-2 block text-sm font-bold text-[#14213d]">لغة الموقع</label>
          <select id="khedmty-locale" value={locale} onChange={(event) => save(event.target.value as Locale, theme)} className="w-full rounded-xl border p-3">
            <option value="ar">العربية</option>
            <option value="en" disabled>English — قريبًا بعد اكتمال ترجمة جميع الصفحات</option>
          </select>
          <p className="mt-2 text-xs leading-6 text-slate-500">لن نفعّل الإنجليزية قبل ترجمة كل الصفحات والقوائم والرسائل حتى لا تظهر واجهة مختلطة.</p>
        </div>
        <div>
          <span className="mb-2 block text-sm font-bold text-[#14213d]">المظهر</span>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => save(locale, "light")} aria-pressed={theme === "light"} className={`rounded-xl border px-4 py-3 font-bold transition ${theme === "light" ? "border-orange-400 bg-orange-50 text-orange-700" : "border-slate-200 text-slate-600"}`}>
              <span className="inline-flex items-center gap-2"><UiIcon name="sun" size={18}/> فاتح</span>
            </button>
            <button type="button" onClick={() => save(locale, "dark")} aria-pressed={theme === "dark"} className={`rounded-xl border px-4 py-3 font-bold transition ${theme === "dark" ? "border-orange-400 bg-orange-50 text-orange-700" : "border-slate-200 text-slate-600"}`}>
              <span className="inline-flex items-center gap-2"><UiIcon name="moon" size={18}/> داكن</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
