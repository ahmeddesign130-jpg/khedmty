import Link from "next/link";

export default function LoginPage() {
  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-[#f5f6f8] px-5 py-10"
    >
      <section className="w-full max-w-md rounded-3xl bg-white p-7 shadow-lg md:p-10">
        <Link
          href="/"
          className="block text-center text-3xl font-black text-orange-500"
        >
          خِدمتي
        </Link>

        <h1 className="mt-8 text-center text-2xl font-black text-[#14213d]">
          تسجيل الدخول
        </h1>

        <p className="mt-3 text-center text-sm text-slate-500">
          سجّل دخولك للوصول إلى حسابك ومتابعة طلباتك.
        </p>

        <form
          action="/api/auth/login"
          method="POST"
          className="mt-8 space-y-5"
        >
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              البريد الإلكتروني
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="name@example.com"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left outline-none transition focus:border-orange-500"
              dir="ltr"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              كلمة المرور
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="أدخل كلمة المرور"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left outline-none transition focus:border-orange-500"
              dir="ltr"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-orange-500 px-5 py-4 font-black text-white transition hover:bg-orange-600"
          >
            دخول
          </button>
        </form>

        <p className="mt-7 text-center text-sm text-slate-600">
          ليس لديك حساب؟{" "}
          <Link
            href="/register"
            className="font-black text-orange-600 hover:text-orange-700"
          >
            إنشاء حساب
          </Link>
        </p>

        <Link
          href="/"
          className="mt-5 block text-center text-sm font-bold text-slate-500"
        >
          العودة للرئيسية
        </Link>
      </section>
    </main>
  );
}
