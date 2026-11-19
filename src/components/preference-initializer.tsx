"use client";

import { useEffect } from "react";

export function PreferenceInitializer({ userId }: { userId: string }) {
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("khedmty-preferences-" + userId) || "{}") as { locale?: string; theme?: string };
      const locale = saved.locale === "en" ? "en" : "ar";
      document.documentElement.lang = locale;
      document.documentElement.dir = locale === "en" ? "ltr" : "rtl";
      document.documentElement.dataset.locale = locale;
      document.documentElement.dataset.theme = saved.theme === "dark" ? "dark" : "light";
    } catch {
      document.documentElement.lang = "ar";
      document.documentElement.dir = "rtl";
      document.documentElement.dataset.locale = "ar";
      document.documentElement.dataset.theme = "light";
    }
  }, [userId]);
  return null;
}
