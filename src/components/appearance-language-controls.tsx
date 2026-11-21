"use client";

import { useEffect, useState } from "react";
import { UiIcon } from "@/components/ui-icon";

type Locale = "ar" | "en";
function preferenceKey(userId: string) { return "khedmty-preferences-" + userId; }
function applyPreferences(locale: Locale) {
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  document.documentElement.dataset.locale = locale;
  document.documentElement.dataset.theme = "light";
  window.dispatchEvent(new Event("khedmty-preferences-change"));
}
export function PreferenceInitializer({ userId }: { userId: string }) {
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(preferenceKey(userId)) || "{}") as { locale?: Locale };
      applyPreferences(saved.locale === "en" ? "en" : "ar");
    } catch { applyPreferences("ar"); }
  }, [userId]);
  return null;
}
export function AppearanceLanguageControls({ userId }: { userId: string }) {
  const [locale, setLocale] = useState<Locale>("ar");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(preferenceKey(userId)) || "{}") as { locale?: Locale };
      setLocale(saved.locale === "en" ? "en" : "ar");
    } catch { setLocale("ar"); }
    setReady(true);
  }, [userId]);
  function save(nextLocale: Locale) {
    setLocale(nextLocale);
    try {
      const value = JSON.stringify({ locale: nextLocale, theme: "light" });
      localStorage.setItem(preferenceKey(userId), value);
      localStorage.setItem("khedmty-public-preferences", value);
    } catch {}
    applyPreferences(nextLocale);
  }
  if (!ready) return null;
  return (
    <section className="settings-surface rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="ui-icon-tile"><UiIcon name="languages" size={25} /></span>
        <div>
          <h2 className="text-xl font-black text-[#14213d]">لغة الموقع</h2>
          <p className="mt-1 text-sm text-slate-500">اختَر لغة الموقع، وسيتم حفظها لهذا الحساب على هذا الجهاز.</p>
        </div>
      </div>
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={() => save("ar")} aria-pressed={locale === "ar"} className={`settings-choice rounded-xl border px-3 py-4 font-bold transition ${locale === "ar" ? "is-selected" : ""}`}>
          <span className="flex items-center justify-center gap-2"><UiIcon name="languages" size={19}/> العربية</span>
        </button>
        <button type="button" onClick={() => save("en")} aria-pressed={locale === "en"} className={`settings-choice rounded-xl border px-3 py-4 font-bold transition ${locale === "en" ? "is-selected" : ""}`}>
          <span className="flex items-center justify-center gap-2"><UiIcon name="globe" size={19}/> English</span>
        </button>
      </div>
    </section>
  );
}
