"use client";

import { useEffect, useState } from "react";
import { UiIcon } from "@/components/ui-icon";

type Locale = "ar" | "en";
type Theme = "light" | "dark";

function preferenceKey(userId: string) {
  return "khedmty-preferences-" + userId;
}

function applyPreferences(locale: Locale, theme: Theme) {
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  document.documentElement.dataset.locale = locale;
  document.documentElement.dataset.theme = theme;
  window.dispatchEvent(new Event("khedmty-preferences-change"));
}

export function PreferenceInitializer({ userId }: { userId: string }) {
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(preferenceKey(userId)) || "{}") as { locale?: Locale; theme?: Theme };
      applyPreferences(saved.locale === "en" ? "en" : "ar", saved.theme === "dark" ? "dark" : "light");
    } catch {
      applyPreferences("ar", "light");
    }
  }, [userId]);
  return null;
}

export function AppearanceLanguageControls({ userId }: { userId: string }) {
  const [locale, setLocale] = useState<Locale>("ar");
  const [theme, setTheme] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(preferenceKey(userId)) || "{}") as { locale?: Locale; theme?: Theme };
      setLocale(saved.locale === "en" ? "en" : "ar");
      setTheme(saved.theme === "dark" ? "dark" : "light");
    } catch {
      setLocale("ar");
      setTheme("light");
    }
    setReady(true);
  }, [userId]);

  function save(nextLocale: Locale, nextTheme: Theme) {
    setLocale(nextLocale);
    setTheme(nextTheme);
    applyPreferences(nextLocale, nextTheme);
    try {
      localStorage.setItem(preferenceKey(userId), JSON.stringify({ locale: nextLocale, theme: nextTheme }));
    } catch {
      // The current page still updates if browser storage is unavailable.
    }
  }

  if (!ready) return null;

  return (
    <section className="settings-surface rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="ui-icon-tile"><UiIcon name="settings" size={25} /></span>
        <div>
          <h2 className="text-xl font-black text-[#14213d]">اللغة والمظهر</h2>
          <p className="mt-1 text-sm text-slate-500">اختَر تفضيلات العرض، وسيتم حفظها لهذا الحساب على هذا الجهاز.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-bold text-[#14213d]">لغة الموقع</h3>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => save("ar", theme)} aria-pressed={locale === "ar"} className={`settings-choice rounded-xl border px-3 py-4 font-bold transition ${locale === "ar" ? "is-selected" : ""}`}>
              <span className="flex items-center justify-center gap-2"><UiIcon name="languages" size={19}/> العربية</span>
            </button>
            <button type="button" onClick={() => save("en", theme)} aria-pressed={locale === "en"} className={`settings-choice rounded-xl border px-3 py-4 font-bold transition ${locale === "en" ? "is-selected" : ""}`}>
              <span className="flex items-center justify-center gap-2"><UiIcon name="globe" size={19}/> English</span>
            </button>
          </div>
          <p className="mt-2 text-xs leading-6 text-slate-500">يتغير اتجاه الصفحة والخط عند اختيار English. ترجمة جميع نصوص الصفحات والقوائم ما زالت قيد الاستكمال.</p>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-bold text-[#14213d]">مظهر الموقع</h3>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => save(locale, "light")} aria-pressed={theme === "light"} className={`settings-choice rounded-xl border px-3 py-4 font-bold transition ${theme === "light" ? "is-selected" : ""}`}>
              <span className="flex items-center justify-center gap-2"><UiIcon name="sun" size={19}/> فاتح</span>
            </button>
            <button type="button" onClick={() => save(locale, "dark")} aria-pressed={theme === "dark"} className={`settings-choice rounded-xl border px-3 py-4 font-bold transition ${theme === "dark" ? "is-selected" : ""}`}>
              <span className="flex items-center justify-center gap-2"><UiIcon name="moon" size={19}/> داكن</span>
            </button>
          </div>
          <p className="mt-2 text-xs leading-6 text-slate-500">المظهر يتطبق على الصفحات كلها، ويظل محفوظًا عند التنقل داخل الموقع.</p>
        </div>
      </div>
    </section>
  );
}
