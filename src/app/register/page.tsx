import Link from "next/link";

export default function RegisterPage() {
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
          إنشاء حساب جديد
        </h1>

        <p className="mt-3 text-center text-sm text-slate-500">
          انضم إلى خِدمتي وابدأ رحلتك معنا.
        </p>

        <form
          action="/api/auth/register"
          method="POST"
          className="mt-8 space-y-5"
        >
          <div>
            <label
              htmlFor="displayName"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              الاسم
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              autoComplete="name"
              minLength={2}
              maxLength={70}
              required
              placeholder="اكتب اسمك"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-500"
            />
          </div>

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
              dir="ltr"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left outline-none transition focus:border-orange-500"
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
              autoComplete="new-password"
              minLength={10}
              maxLength={72}
              required
              placeholder="10 أحرف على الأقل"
              dir="ltr"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left outline-none transition focus:border-orange-500"
            />
          </div>

          <div>
            <label
              htmlFor="role"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              نوع الحساب
            </label>
            <select
              id="role"
              name="role"
              defaultValue="CUSTOMER"
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-orange-500"
            >
              <option value="CUSTOMER">عميل - أريد شراء الخدمات</option>
              <option value="PROVIDER">مقدم خدمة - أريد عرض خدماتي</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-orange-500 px-5 py-4 font-black text-white transition hover:bg-orange-600"
          >
            إنشاء الحساب
          </button>
        </form>

        <p className="mt-7 text-center text-sm text-slate-600">
          لديك حساب بالفعل؟{" "}
          <Link
            href="/login"
            className="font-black text-orange-600 hover:text-orange-700"
          >
            تسجيل الدخول
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
