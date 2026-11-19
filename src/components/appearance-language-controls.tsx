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
    const key = "khedmty-preferences-" + userId;
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "{}") as { locale?: Locale; theme?: Theme };
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
  const english = locale === "en";
  return (
    <div className="fixed bottom-4 left-4 z-[80] flex items-center gap-2 rounded-2xl border border-white/50 bg-white/75 p-2 shadow-xl backdrop-blur-2xl dark-control-shell" aria-label={english ? "Display preferences" : "تفضيلات العرض"}>
      <button type="button" onClick={() => save(english ? "ar" : "en", theme)} className="ios-icon-glass h-10 min-w-10 gap-2 px-3 text-sm font-bold" aria-label={english ? "Switch to Arabic" : "التبديل إلى الإنجليزية"}>
        <UiIcon name="globe" size={18} />{english ? "عربي" : "EN"}
      </button>
      <button type="button" onClick={() => save(locale, theme === "dark" ? "light" : "dark")} className="ios-icon-glass h-10 min-w-10 px-3" aria-label={theme === "dark" ? (english ? "Light mode" : "الوضع الفاتح") : (english ? "Dark mode" : "الوضع الداكن")}>
        <UiIcon name={theme === "dark" ? "sun" : "moon"} size={19} />
        <span className="text-xs font-bold">{theme === "dark" ? (english ? "Light" : "فاتح") : (english ? "Dark" : "داكن")}</span>
      </button>
    </div>
  );
}
