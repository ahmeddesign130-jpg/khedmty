 "use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"CUSTOMER"|"PROVIDER">("CUSTOMER");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName, email, password, role }) });
      const data = await response.json();
      setMessage(data.message || data.error || "تعذر إنشاء الحساب.");
    } catch { setMessage("تعذر الاتصال بالخادم."); }
    finally { setBusy(false); }
  }

  return <main className="flex min-h-screen items-center justify-center px-5 py-12"><div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-900/5"><Link href="/" className="text-2xl font-extrabold">خِدمتي<span className="text-orange-500">.</span></Link><h1 className="mt-8 text-2xl font-extrabold">أنشئ حسابك</h1><p className="mt-2 text-sm leading-7 text-slate-500">ابدأ رحلتك على خِدمتي.</p><form onSubmit={submit} className="mt-8 space-y-5"><label className="block text-sm font-bold">الاسم<input required minLength={2} value={displayName} onChange={e=>setDisplayName(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-400" /></label><label className="block text-sm font-bold">البريد الإلكتروني<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-400" dir="ltr" /></label><label className="block text-sm font-bold">كلمة المرور<input required minLength={10} type="password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-400" dir="ltr" /><span className="mt-1 block text-xs font-normal text-slate-400">10 أحرف على الأقل.</span></label><fieldset><legend className="mb-3 text-sm font-bold">نوع الحساب</legend><div className="grid grid-cols-2 gap-3"><button type="button" onClick={()=>setRole("CUSTOMER")} className={`rounded-xl border p-3 text-sm font-bold ${role==="CUSTOMER" ? "border-orange-400 bg-orange-50 text-orange-700" : "border-slate-200"}`}>عميل</button><button type="button" onClick={()=>setRole("PROVIDER")} className={`rounded-xl border p-3 text-sm font-bold ${role==="PROVIDER" ? "border-orange-400 bg-orange-50 text-orange-700" : "border-slate-200"}`}>مقدم خدمة</button></div></fieldset><button disabled={busy} className="w-full rounded-xl bg-orange-500 px-4 py-4 font-bold text-white disabled:opacity-60">{busy ? "جارٍ إنشاء الحساب..." : "إنشاء الحساب"}</button>{message && <p role="status" className="text-sm leading-7 text-slate-600">{message}</p>}</form><p className="mt-6 text-center text-sm text-slate-500">لديك حساب؟ <Link className="font-bold text-orange-600" href="/login">سجّل الدخول</Link></p></div></main>;
}
