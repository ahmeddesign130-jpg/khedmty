"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";

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
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const rules = useMemo(() => ({
    length: password.length >= 10 && password.length <= 72,
    cases: /[A-Z]/.test(password) && /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  }), [password]);
  const validPassword = Object.values(rules).every(Boolean);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");
    if (!validPassword) {
      document.getElementById("password")?.focus();
      return;
    }
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        body: new FormData(form),
        redirect: "follow",
        cache: "no-store",
      });
      if (response.redirected && response.url) {
        window.location.assign(response.url);
        return;
      }
      setSubmitError("تعذر إكمال التسجيل. حاول مرة أخرى.");
      setSubmitting(false);
    } catch {
      setSubmitError("الاتصال ضعيف أو انقطع. تأكد من الإنترنت وحاول مرة أخرى.");
      setSubmitting(false);
    }
  }

  const ruleClass = (passed: boolean) => passed ? "text-emerald-600" : "text-slate-500";

  return (
    <form action="/api/auth/register" method="POST" onSubmit={handleSubmit} className="mt-6 space-y-4">
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
        <input id="password" name="password" type="password" autoComplete="new-password" maxLength={72} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="أنشئ كلمة مرور قوية" dir="ltr" className="w-full px-4 py-3 text-sm text-left"/>
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
      {(error || submitError) && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{submitError || messages[error || ""] || messages.email_send}</p>}
      <button type="submit" disabled={submitting} className="w-full rounded-xl bg-orange-500 px-5 py-3.5 text-base font-semibold text-white shadow-md shadow-orange-500/15 disabled:cursor-wait disabled:opacity-70">
        {submitting ? "جارٍ إرسال الكود..." : "إرسال كود التأكيد"}
      </button>
    </form>
  );
}
