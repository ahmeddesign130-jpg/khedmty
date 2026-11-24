import Link from "next/link";
import { PasswordInput } from "@/components/password-input";

const errors: Record<string, string> = {
  missing: "اكتب البريد الإلكتروني وكلمة المرور.",
  invalid: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
  suspended: "هذا الحساب موقوف. تواصل مع إدارة خِدمتي.",
  server: "حصل خطأ أثناء تسجيل الدخول. حاول مرة أخرى بعد قليل.",
  google_disabled: "تسجيل الدخول متاح بالبريد الإلكتروني وكلمة المرور فقط.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; registered?: string; verified?: string; reset?: string }> }) {
  const params = await searchParams;
  return (
    <main dir="rtl" className="auth-v7-page flex min-h-screen items-center justify-center px-5 py-10">
      <section className="auth-v7-card auth-readable glass-surface w-full max-w-md rounded-[30px] p-7 md:p-10">
        <h1 className="mt-3 text-center text-3xl font-black text-white">تسجيل الدخول</h1>
        <p className="mt-3 text-center text-base leading-8 text-slate-300">كمّل من حيث توقفت: تابع طلباتك ومدفوعاتك وخدماتك من حسابك.</p>
        {params.verified === "1" && <p role="status" className="mt-5 rounded-xl bg-green-50 p-4 text-sm font-bold text-green-700">تم تأكيد بريدك الإلكتروني بنجاح. سجّل الدخول الآن.</p>}
        {params.registered === "1" && <p role="status" className="mt-5 rounded-xl bg-green-50 p-4 text-sm font-bold text-green-700">تم إنشاء حسابك بنجاح. سجّل الدخول الآن.</p>}
        {params.reset === "1" && <p role="status" className="mt-5 rounded-xl bg-green-50 p-4 text-sm font-bold text-green-700">تم تغيير كلمة المرور بنجاح. سجّل الدخول بكلمة المرور الجديدة.</p>}
        {params.error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">{errors[params.error] || errors.server}</p>}
        <p className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm font-semibold leading-7 text-slate-700">تسجيل الدخول متاح بالبريد الإلكتروني وكلمة المرور.</p>
        <form action="/api/auth/login" method="POST" className="space-y-5">
          <div><label htmlFor="email" className="mb-2 block text-base font-bold text-slate-700">البريد الإلكتروني</label><input id="email" name="email" type="email" autoComplete="email" required placeholder="name@example.com" className="w-full px-4 py-4 text-base text-left" dir="ltr"/></div>
          <div><label htmlFor="password" className="mb-2 block text-sm font-bold text-slate-700">كلمة المرور</label><PasswordInput id="password" name="password" autoComplete="current-password" placeholder="أدخل كلمة المرور" className="w-full px-4 py-3.5"/><Link href="/forgot-password" prefetch={false} className="mt-2 inline-block text-sm font-semibold text-orange-600">نسيت كلمة المرور؟</Link></div>
          <button type="submit" className="w-full rounded-xl bg-orange-500 px-5 py-4 text-lg font-black text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600">دخول</button>
        </form>
        <p className="mt-7 text-center text-base text-slate-600">ليس لديك حساب؟ <Link href="/register" className="font-black text-orange-600">إنشاء حساب</Link></p>
        <Link href="/" className="mt-5 block text-center text-base font-bold text-slate-600">العودة للرئيسية</Link>
        <p className="auth-creator-name mt-8 border-t border-slate-200/70 pt-5 text-center text-sm font-black tracking-[0.12em]">AHMED ZAKRAIA ALI</p>
      </section>
    </main>
  );
}
