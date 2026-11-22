"use client";

import { useMemo, useState } from "react";

const messages: Record<string, string> = {
  terms_required: "لازم توافق على شروط الخدمة قبل إنشاء الحساب.",
  invalid: "راجع الاسم والبريد الإلكتروني ورقم الهاتف.",
  password_policy: "كلمة المرور لا تحقق القواعد الموضحة تحت الخانة.",
  phone: "اكتب رقم موبايل مصري صحيح يبدأ بـ 010 أو 011 أو 012 أو 015.",
  role: "نوع الحساب غير صحيح.",
  exists: "هذا البريد مسجل بالفعل. جرّب تسجيل الدخول.",
  email_send: "تعذر إرسال كود التأكيد. راجع إعدادات البريد وحاول مرة أخرى.",
  google_account_required: "البريد ده مش مسجل في خِدمتي. أنشئ حسابك بالبريد الإلكتروني وكلمة المرور.",
};

export function RegisterForm({ error }: { error?: string }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const rules = useMemo(() => ({
    length: password.length >= 10 && password.length <= 72,
    cases: /[A-Z]/.test(password) && /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  }), [password]);
  const validPassword = Object.values(rules).every(Boolean);

  const ruleClass = (passed: boolean) => passed ? "text-emerald-600" : "text-slate-500";

  return (
    <form action="/api/auth/register" method="POST" className="mt-6 space-y-4">
      <label className="terms-acceptance rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-medium leading-7 text-slate-700">
        <input type="checkbox" name="termsAccepted" value="yes" required className="mt-2 h-5 w-5 shrink-0 accent-orange-500"/>
        <span>قرأت وأوافق على <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-orange-700 underline">شروط الخدمة</a> وسياسة الاستخدام.</span>
      </label>
      <div>
        <label htmlFor="displayName" className="mb-1.5 block text-sm font-semibold text-slate-700">الاسم</label>
        <input id="displayName" name="displayName" type="text" autoComplete="name" minLength={2} maxLength={70} required placeholder="اكتب اسمك" className="w-full px-4 py-3 text-sm"/>
      </div>
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-slate-700">البريد الإلكتروني</label>
        <input id="email" name="email" type="email" autoComplete="email" required placeholder="name@example.com" dir="ltr" className="w-full px-4 py-3 text-sm text-left"/>
      </div>
      <div>
        <label htmlFor="phone" className="mb-1.5 block text-sm font-semibold text-slate-700">رقم الموبايل</label>
        <input id="phone" name="phone" type="tel" inputMode="numeric" autoComplete="tel" pattern="01[0125][0-9]{8}" minLength={11} maxLength={11} required placeholder="01xxxxxxxxx" dir="ltr" className="w-full px-4 py-3 text-sm text-left"/>
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-slate-700">كلمة المرور</label>
        <div className="relative">
          <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" maxLength={72} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="أنشئ كلمة مرور قوية" dir="ltr" className="w-full px-4 py-3 pe-12 text-sm text-left"/>
          <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} className="absolute inset-y-0 right-2 my-auto flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
            {showPassword ? <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8"/><path d="M9.9 5.2A10.8 10.8 0 0112 5c5 0 8.5 4.5 9.5 7-.4 1-1.2 2.2-2.4 3.3M6.2 6.2C3.8 7.8 2.7 10 2.5 12c.5 1.2 3.8 7 9.5 7 1.4 0 2.7-.4 3.8-1"/></svg> : <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z"/><circle cx="12" cy="12" r="2.7"/></svg>}
          </button>
        </div>
        <div className="mt-2 grid grid-cols-1 gap-1 text-xs leading-5 sm:grid-cols-2" aria-live="polite">
          <span className={ruleClass(rules.length)}>• 10 أحرف على الأقل</span>
          <span className={ruleClass(rules.cases)}>• حرف كبير وحرف صغير (A / a)</span>
          <span className={ruleClass(rules.number)}>• رقم واحد على الأقل (0–9)</span>
          <span className={ruleClass(rules.symbol)}>• رمز خاص مثل # أو *</span>
        </div>
      </div>
      <div>
        <label htmlFor="role" className="mb-1.5 block text-sm font-semibold text-slate-700">نوع الحساب</label>
        <select id="role" name="role" defaultValue="CUSTOMER" required className="w-full px-4 py-3 text-sm">
          <option value="CUSTOMER">عميل - أريد شراء الخدمات</option>
          <option value="PROVIDER">مقدم خدمة - أريد عرض خدماتي</option>
        </select>
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{messages[error] || messages.email_send}</p>}
      <button type="submit" disabled={!validPassword} className="w-full rounded-xl bg-orange-500 px-5 py-3.5 text-base font-semibold text-white shadow-md shadow-orange-500/15 disabled:cursor-wait disabled:opacity-70">
        إرسال كود التأكيد
      </button>
    </form>
  );
}
