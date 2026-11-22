import Link from "next/link";

const errors: Record<string, string> = {
  terms_required: "لازم توافق على شروط الخدمة قبل إنشاء الحساب.",
  invalid: "راجع البيانات: الاسم من 2 إلى 70 حرفًا، وكلمة المرور من 10 إلى 72 حرفًا.",
  role: "نوع الحساب غير صحيح.",
  exists: "هذا البريد مسجل بالفعل. جرّب تسجيل الدخول.",
  server: "تعذر إنشاء الحساب حاليًا. حاول مرة أخرى.",
  google_account_required: "البريد ده مش مسجل في خِدمتي. أنشئ حسابًا بالبريد وكلمة المرور، ثم أكّد بريدك برمز OTP.",
};

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <main dir="rtl" className="auth-v7-page flex min-h-screen items-center justify-center px-5 py-10">
      <section className="auth-v7-card auth-readable glass-surface w-full max-w-md rounded-[30px] p-7 md:p-10">
        <h1 className="mt-3 text-center text-3xl font-black text-white">إنشاء حساب جديد</h1>
        <p className="mt-3 text-center text-base leading-8 text-slate-300">حساب واحد يوصلك للخدمة اللي تحتاجها أو يفتح مهارتك لعملاء جدد.</p>
        {params.error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">{errors[params.error] || errors.server}</p>}
        <form action="/api/auth/register" method="POST" className="mt-7 space-y-5">
          <label className="terms-acceptance rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold leading-7 text-slate-700">
            <input type="checkbox" name="termsAccepted" value="yes" required className="mt-2 h-5 w-5 shrink-0 accent-orange-500"/>
            <span>قرأت وأوافق على <Link href="/terms" target="_blank" className="font-black text-orange-700 underline">شروط الخدمة</Link> وسياسة الاستخدام.</span>
          </label>
          <div><label htmlFor="displayName" className="mb-2 block text-base font-bold text-slate-700">الاسم</label><input id="displayName" name="displayName" type="text" autoComplete="name" minLength={2} maxLength={70} required placeholder="اكتب اسمك" className="w-full px-4 py-4 text-base"/></div>
          <div><label htmlFor="email" className="mb-2 block text-sm font-bold text-slate-700">البريد الإلكتروني</label><input id="email" name="email" type="email" autoComplete="email" required placeholder="name@example.com" dir="ltr" className="w-full px-4 py-4 text-base text-left"/></div>
          <div><label htmlFor="password" className="mb-2 block text-sm font-bold text-slate-700">كلمة المرور</label><input id="password" name="password" type="password" autoComplete="new-password" minLength={10} maxLength={72} required placeholder="10 أحرف على الأقل" dir="ltr" className="w-full px-4 py-3.5 text-left"/></div>
          <div><label htmlFor="role" className="mb-2 block text-sm font-bold text-slate-700">نوع الحساب</label><select id="role" name="role" defaultValue="CUSTOMER" required className="w-full px-4 py-3.5"><option value="CUSTOMER">عميل - أريد شراء الخدمات</option><option value="PROVIDER">مقدم خدمة - أريد عرض خدماتي</option></select></div>
          <button type="submit" className="w-full rounded-xl bg-orange-500 px-5 py-4 text-lg font-black text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600">إنشاء الحساب</button>
        </form>
        <p className="mt-7 text-center text-base text-slate-600">لديك حساب بالفعل؟ <Link href="/login" className="font-black text-orange-600">تسجيل الدخول</Link></p>
        <Link href="/" className="mt-5 block text-center text-base font-bold text-slate-600">العودة للرئيسية</Link>
        <p className="auth-creator-name mt-8 border-t border-slate-200/70 pt-5 text-center text-sm font-black tracking-[0.12em]">AHMED ZAKRAIA ALI</p>
      </section>
    </main>
  );
}
