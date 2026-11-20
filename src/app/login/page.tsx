import Link from "next/link";

const errors: Record<string, string> = {
  missing: "اكتب البريد الإلكتروني وكلمة المرور.",
  invalid: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
  suspended: "هذا الحساب موقوف. تواصل مع إدارة خِدمتي.",
  server: "حصل خطأ أثناء تسجيل الدخول. حاول مرة أخرى بعد قليل.",
  google_not_configured: "تسجيل Google يحتاج إكمال إعداداته أولًا.",
  google_failed: "تعذر تسجيل الدخول باستخدام Google. حاول مرة أخرى.",
  google_state: "انتهت جلسة Google أو لم تصل ملفات التحقق. جرّب مرة أخرى.",
  google_config: "إعدادات Google غير مكتملة في نسخة التجربة.",
  google_token: "تعذر تأكيد الدخول مع Google. راجع إعدادات رابط الرجوع.",
  google_profile: "لم نتمكن من قراءة بيانات حساب Google الموثّق.",
  google_session: "تم التحقق من Google لكن تعذر إنشاء جلسة الدخول.",
  google_denied: "تم إلغاء تسجيل الدخول باستخدام Google.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; registered?: string }> }) {
  const params = await searchParams;
  return (
    <main dir="rtl" className="auth-v7-page flex min-h-screen items-center justify-center px-5 py-10">
      <section className="auth-v7-card glass-surface w-full max-w-md rounded-[30px] p-7 md:p-10">
        <Link href="/" className="block text-center text-3xl font-black text-orange-600">خِدمتي</Link>
        <h1 className="mt-8 text-center text-3xl font-black text-white">تسجيل الدخول</h1>
        <p className="mt-3 text-center text-base leading-8 text-slate-300">كمّل من حيث توقفت: تابع طلباتك ومدفوعاتك وخدماتك من حسابك.</p>
        {params.registered === "1" && <p role="status" className="mt-5 rounded-xl bg-green-50 p-4 text-sm font-bold text-green-700">تم إنشاء حسابك بنجاح. سجّل الدخول الآن.</p>}
        {params.error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">{errors[params.error] || errors.server}</p>}
        <a href="/api/auth/google?intent=login" className="group mt-7 flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[15px] font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400">
          <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 3.08 13.22l7.98 6.19C12.95 13.72 18.02 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.72 7.18l7.64 5.93c4.46-4.12 7.12-10.2 7.12-17.58z"/><path fill="#FBBC05" d="M11.06 28.59A14.5 14.5 0 0 1 10.3 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.88.93 7.55 3.08 10.78l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.87l-7.64-5.93c-2.12 1.42-4.84 2.26-8.26 2.26-5.98 0-11.05-4.22-12.94-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          <span>المتابعة باستخدام Google</span>
        </a>
        <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm font-semibold leading-7 text-slate-700">اختار حساب Google الموجود على جهازك، ولو أول مرة تستخدم خِدمتي أنشئ حسابك أولًا.</p>
        <div className="my-6 flex items-center gap-3 text-sm font-bold text-slate-600"><span className="h-px flex-1 bg-slate-100"/><span>أو بالبريد الإلكتروني</span><span className="h-px flex-1 bg-slate-100"/></div>
        <form action="/api/auth/login" method="POST" className="space-y-5">
          <div><label htmlFor="email" className="mb-2 block text-base font-bold text-slate-700">البريد الإلكتروني</label><input id="email" name="email" type="email" autoComplete="email" required placeholder="name@example.com" className="w-full px-4 py-4 text-base text-left" dir="ltr"/></div>
          <div><label htmlFor="password" className="mb-2 block text-sm font-bold text-slate-700">كلمة المرور</label><input id="password" name="password" type="password" autoComplete="current-password" required placeholder="أدخل كلمة المرور" className="w-full px-4 py-3.5 text-left" dir="ltr"/></div>
          <button type="submit" className="w-full rounded-xl bg-orange-500 px-5 py-4 text-lg font-black text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600">دخول</button>
        </form>
        <p className="mt-7 text-center text-base text-slate-600">ليس لديك حساب؟ <Link href="/register" className="font-black text-orange-600">إنشاء حساب</Link></p>
        <Link href="/" className="mt-5 block text-center text-base font-bold text-slate-600">العودة للرئيسية</Link>
      </section>
    </main>
  );
}
