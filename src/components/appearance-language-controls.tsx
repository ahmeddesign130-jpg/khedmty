"use client";

import { useEffect, useState } from "react";
import { UiIcon } from "@/components/ui-icon";

type Locale = "ar" | "en";
type Palette = "orange" | "ocean" | "emerald" | "violet" | "rose" | "teal" | "amber";
type Font = "alexandria" | "cairo" | "tajawal" | "ibm-plex" | "noto-sans" | "noto-kufi" | "almarai" | "readex" | "changa" | "el-messiri" | "amiri" | "mada" | "harmattan" | "reem-kufi" | "baloo";
type Preferences = { locale: Locale; theme: "light" | "dark"; palette: Palette; font: Font };
const defaults: Preferences = { locale: "ar", theme: "light", palette: "orange", font: "alexandria" };
const palettes: { id: Palette; label: string; color: string }[] = [
  { id: "orange", label: "برتقالي", color: "#f47721" }, { id: "ocean", label: "أزرق", color: "#168aad" },
  { id: "emerald", label: "أخضر", color: "#15966b" }, { id: "violet", label: "بنفسجي", color: "#7954c8" },
  { id: "rose", label: "وردي", color: "#d94b78" }, { id: "teal", label: "فيروزي", color: "#0d9488" },
  { id: "amber", label: "ذهبي", color: "#c58a12" },
];
const fonts: { id: Font; label: string }[] = [
  { id: "alexandria", label: "Alexandria" }, { id: "cairo", label: "Cairo" }, { id: "tajawal", label: "Tajawal" },
  { id: "ibm-plex", label: "IBM Plex Sans Arabic" }, { id: "noto-sans", label: "Noto Sans Arabic" },
  { id: "noto-kufi", label: "Noto Kufi Arabic" }, { id: "almarai", label: "Almarai" }, { id: "readex", label: "Readex Pro" },
  { id: "changa", label: "Changa" }, { id: "el-messiri", label: "El Messiri" }, { id: "amiri", label: "Amiri" },
  { id: "mada", label: "Mada" }, { id: "harmattan", label: "Harmattan" }, { id: "reem-kufi", label: "Reem Kufi" },
  { id: "baloo", label: "Baloo Bhaijaan 2" },
];
function preferenceKey(userId: string) { return "khedmty-preferences-" + userId; }
function applyPreferences(p: Preferences) {
  const root = document.documentElement;
  root.lang = p.locale; root.dir = p.locale === "ar" ? "rtl" : "ltr";
  root.dataset.locale = p.locale; root.dataset.theme = p.theme; root.dataset.palette = p.palette; root.dataset.font = p.font;
  window.dispatchEvent(new Event("khedmty-preferences-change"));
}
export function AppearanceLanguageControls({ userId }: { userId: string }) {
  const [preferences, setPreferences] = useState<Preferences>(defaults);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(preferenceKey(userId)) || localStorage.getItem("khedmty-public-preferences") || "{}") as Partial<Preferences>;
      const next = { ...defaults, ...saved };
      setPreferences(next); applyPreferences(next);
    } catch { applyPreferences(defaults); }
    setReady(true);
  }, [userId]);
  function save<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    try {
      const serialized = JSON.stringify(next);
      localStorage.setItem(preferenceKey(userId), serialized);
      localStorage.setItem("khedmty-public-preferences", serialized);
    } catch {}
    applyPreferences(next);
  }
  if (!ready) return null;
  return (
    <section className="settings-surface rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3"><span className="ui-icon-tile"><UiIcon name="languages" size={25}/></span><div><h2 className="text-xl font-black text-[#14213d]">لغة الموقع</h2><p className="mt-1 text-sm text-slate-500">غيّر اللغة وسيتم تطبيقها على واجهة الموقع وحفظ اختيارك.</p></div></div>
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={() => save("locale","ar")} aria-pressed={preferences.locale==="ar"} className={`settings-choice rounded-xl border px-3 py-4 font-bold transition ${preferences.locale==="ar"?"is-selected":""}`}>العربية</button>
        <button type="button" onClick={() => save("locale","en")} aria-pressed={preferences.locale==="en"} className={`settings-choice rounded-xl border px-3 py-4 font-bold transition ${preferences.locale==="en"?"is-selected":""}`}>English</button>
      </div>
      <div className="mt-7 border-t border-slate-100 pt-6"><h3 className="font-black text-[#14213d]">الخط العربي</h3><p className="mt-1 text-sm text-slate-500">اختر من 15 خطًا، ويتغير الخط على صفحات الموقع كلها.</p>
        <select value={preferences.font} onChange={e=>save("font",e.target.value as Font)} className="mt-3 w-full rounded-xl border p-3" dir="ltr">{fonts.map(f=><option key={f.id} value={f.id}>{f.label}</option>)}</select>
        <p className="mt-2 text-sm" style={{fontFamily:fonts.find(f=>f.id===preferences.font)?.label}}>معاينة: خِدمتي — مهارتك تستحق التميز</p>
      </div>
      <div className="mt-7 border-t border-slate-100 pt-6"><h3 className="font-black text-[#14213d]">ألوان الموقع</h3><p className="mt-1 text-sm text-slate-500">7 لوحات ألوان متناسقة، ويمكنك تغيير اللون الأساسي في أي وقت.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{palettes.map(p=><button key={p.id} type="button" onClick={()=>save("palette",p.id)} aria-pressed={preferences.palette===p.id} className={`flex min-h-12 items-center gap-2 rounded-xl border p-3 text-sm font-bold ${preferences.palette===p.id?"is-selected border-slate-400":"border-slate-200"}`}><span className="h-5 w-5 rounded-full" style={{background:p.color}}/>{p.label}</button>)}</div>
      </div>
      <div className="mt-7 border-t border-slate-100 pt-6"><h3 className="font-black text-[#14213d]">المظهر</h3><div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={()=>save("theme","light")} aria-pressed={preferences.theme==="light"} className={`settings-choice rounded-xl border px-3 py-3 font-bold ${preferences.theme==="light"?"is-selected":""}`}>فاتح</button>
        <button type="button" onClick={()=>save("theme","dark")} aria-pressed={preferences.theme==="dark"} className={`settings-choice rounded-xl border px-3 py-3 font-bold ${preferences.theme==="dark"?"is-selected":""}`}>داكن</button>
      </div></div>
    </section>
  );
}
