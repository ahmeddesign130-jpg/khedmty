export default function RegisterPage() {
  return (
    <main dir="rtl" className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-5 py-12">
      <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-lg">
        <a href="/" className="text-3xl font-black text-orange-500">
          خِدمتي
        </a>

        <h1 className="mt-8 text-3xl font-black text-[#14213d]">
          إنشاء حساب جديد
        </h1>

        <p className="mt-3 text-gray-500">
          انضم إلى خِدمتي وابدأ رحلتك.
        </p>

        <form action="/api/auth/register" method="POST" className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block font-bold">الاسم</label>
            <input
              type="text"
              name="displayName"
              required
              minLength={2}
              maxLength={70}
              placeholder="اكتب اسمك"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
            />
          </div>

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
              minLength={10}
              maxLength={72}
              autoComplete="new-password"
              placeholder="10 أحرف على الأقل"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="mb-2 block font-bold">نوع الحساب</label>
            <select
              name="role"
              required
              defaultValue="CUSTOMER"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-orange-500"
            >
              <option value="CUSTOMER">عميل - أريد شراء الخدمات</option>
              <option value="PROVIDER">مقدم خدمة - أريد عرض خدماتي</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-orange-500 py-4 font-bold text-white hover:bg-orange-600"
          >
            إنشاء الحساب
          </button>
        </form>

        <p className="mt-6 text-center text-gray-600">
          لديك حساب بالفعل؟{" "}
          <a href="/login" className="font-bold text-orange-500">
            تسجيل الدخول
          </a>
        </p>
      </div>
    </main>
  );
}
