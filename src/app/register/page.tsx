import Link from "next/link";

const errors: Record<string, string> = {
  invalid: "راجع البيانات: الاسم من 2 إلى 70 حرفًا، وكلمة المرور من 10 إلى 72 حرفًا.",
  role: "نوع الحساب غير صحيح.",
  exists: "هذا البريد مسجل بالفعل. جرّب تسجيل الدخول.",
  server: "تعذر إنشاء الحساب حاليًا. حاول مرة أخرى.",
  google_not_configured: "تسجيل Google يحتاج إكمال إعداداته أولًا.",
  google_failed: "تعذر إنشاء الحساب باستخدام Google. حاول مرة أخرى.",
  google_denied: "تم إلغاء التسجيل باستخدام Google.",
};

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <main dir="rtl" className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#eef1f7] via-[#f8f9fc] to-orange-50 px-5 py-10">
      <section className="w-full max-w-md rounded-[28px] border border-white bg-white p-7 shadow-xl shadow-slate-900/5 md:p-10">
        <Link href="/" className="block text-center text-3xl font-black text-orange-600">خِدمتي</Link>
        <h1 className="mt-8 text-center text-2xl font-black text-[#14213d]">إنشاء حساب جديد</h1>
        <p className="mt-3 text-center text-sm text-slate-500">انضم إلى خِدمتي وابدأ رحلتك معنا.</p>
        {params.error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">{errors[params.error] || errors.server}</p>}
        <div className="mt-7 grid gap-3">
          <a href="/api/auth/google?role=CUSTOMER" className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 font-bold text-slate-700 shadow-sm transition hover:bg-slate-50">التسجيل كعميل باستخدام Google</a>
          <a href="/api/auth/google?role=PROVIDER" className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 font-bold text-slate-700 shadow-sm transition hover:bg-slate-50">التسجيل كمقدم خدمة باستخدام Google</a>
        </div>
        <div className="my-6 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-100"/><span>أو بالبريد الإلكتروني</span><span className="h-px flex-1 bg-slate-100"/></div>
        <form action="/api/auth/register" method="POST" className="space-y-5">
          <div><label htmlFor="displayName" className="mb-2 block text-sm font-bold text-slate-700">الاسم</label><input id="displayName" name="displayName" type="text" autoComplete="name" minLength={2} maxLength={70} required placeholder="اكتب اسمك" className="w-full px-4 py-3.5"/></div>
          <div><label htmlFor="email" className="mb-2 block text-sm font-bold text-slate-700">البريد الإلكتروني</label><input id="email" name="email" type="email" autoComplete="email" required placeholder="name@example.com" dir="ltr" className="w-full px-4 py-3.5 text-left"/></div>
          <div><label htmlFor="password" className="mb-2 block text-sm font-bold text-slate-700">كلمة المرور</label><input id="password" name="password" type="password" autoComplete="new-password" minLength={10} maxLength={72} required placeholder="10 أحرف على الأقل" dir="ltr" className="w-full px-4 py-3.5 text-left"/></div>
          <div><label htmlFor="role" className="mb-2 block text-sm font-bold text-slate-700">نوع الحساب</label><select id="role" name="role" defaultValue="CUSTOMER" required className="w-full px-4 py-3.5"><option value="CUSTOMER">عميل - أريد شراء الخدمات</option><option value="PROVIDER">مقدم خدمة - أريد عرض خدماتي</option></select></div>
          <button type="submit" className="w-full rounded-xl bg-orange-500 px-5 py-4 font-black text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600">إنشاء الحساب</button>
        </form>
        <p className="mt-7 text-center text-sm text-slate-600">لديك حساب بالفعل؟ <Link href="/login" className="font-black text-orange-600">تسجيل الدخول</Link></p>
        <Link href="/" className="mt-5 block text-center text-sm font-bold text-slate-500">العودة للرئيسية</Link>
      </section>
    </main>
  );
}
