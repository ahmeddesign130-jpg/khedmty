import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "استعادة دخول الأدمن | خِدمتي",
  robots: { index: false, follow: false },
};

export default async function AdminResetAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  return (
    <main dir="rtl" className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#eef1f7] via-[#f8f9fc] to-orange-50 px-5 py-10">
      <section className="w-full max-w-md rounded-[28px] border border-white bg-white p-7 shadow-xl shadow-slate-900/5 md:p-10">
        <Link href="/" className="block text-center text-3xl font-black text-orange-600">خِدمتي</Link>
        <h1 className="mt-8 text-center text-2xl font-black text-[#14213d]">استعادة دخول الأدمن</h1>
        <p className="mt-3 text-center text-sm leading-7 text-slate-500">هذه الصفحة مخصصة لإعادة تعيين كلمة مرور حساب الإدارة الأساسي فقط.</p>
        {params.status === "success" && <p role="status" className="mt-5 rounded-xl bg-green-50 p-4 text-sm font-bold text-green-700">تم تحديث كلمة المرور. يمكنك تسجيل الدخول الآن.</p>}
        {params.status === "invalid" && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">مفتاح الأمان غير صحيح أو غير مضبوط.</p>}
        {params.status === "password" && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">كلمة المرور يجب أن تكون 12 حرفًا على الأقل.</p>}
        {params.status === "account" && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">لم يتم العثور على حساب أدمن نشط بهذا البريد.</p>}
        {params.status === "error" && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">حدث خطأ. حاول مرة أخرى لاحقًا.</p>}
        <form action="/api/auth/admin-reset" method="POST" className="mt-7 space-y-5">
          <div>
            <label htmlFor="resetToken" className="mb-2 block text-sm font-bold text-slate-700">مفتاح الأمان</label>
            <input id="resetToken" name="resetToken" type="password" autoComplete="off" required minLength={32} className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-left" dir="ltr" />
          </div>
          <div>
            <label htmlFor="newPassword" className="mb-2 block text-sm font-bold text-slate-700">كلمة المرور الجديدة</label>
            <input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={72} className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-left" dir="ltr" />
            <p className="mt-2 text-xs text-slate-500">12 حرفًا على الأقل. استخدم كلمة مرور قوية وفريدة.</p>
          </div>
          <button type="submit" className="w-full rounded-xl bg-orange-500 px-5 py-4 font-black text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600">تحديث كلمة المرور</button>
        </form>
        <Link href="/login" className="mt-6 block text-center text-sm font-bold text-slate-500">العودة لتسجيل الدخول</Link>
      </section>
    </main>
  );
}
