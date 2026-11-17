export default function LoginPage() {
  return (
    <main dir="rtl" className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-5 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-lg">
        <a href="/" className="text-3xl font-black text-orange-500">
          خِدمتي
        </a>

        <h1 className="mt-8 text-3xl font-black text-[#14213d]">
          أهلاً بعودتك
        </h1>

        <p className="mt-3 text-gray-500">
          سجّل دخولك للوصول إلى حسابك ومتابعة خدماتك.
        </p>

        <form action="/api/auth/login" method="POST" className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block font-bold">البريد الإلكتروني</label>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="example@email.com"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="mb-2 block font-bold">كلمة المرور</label>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              placeholder="اكتب كلمة المرور"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-orange-500 py-4 font-bold text-white transition hover:bg-orange-600"
          >
            تسجيل الدخول
          </button>
        </form>

        <p className="mt-6 text-center text-gray-600">
          ليس لديك حساب؟{" "}
          <a href="/register" className="font-bold text-orange-500">
            إنشاء حساب جديد
          </a>
        </p>

        <a href="/" className="mt-6 block text-center text-sm text-gray-500">
          العودة للرئيسية
        </a>
      </div>
    </main>
  );
}
