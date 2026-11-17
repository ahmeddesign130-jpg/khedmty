import Link from "next/link";

export default function HomePage() {
  return (
    <main dir="rtl" className="min-h-screen bg-[#f7f8fa] text-[#14213d]">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <Link href="/" className="text-3xl font-black text-orange-500">
            خِدمتي
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/login" className="font-bold">
              دخول
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-orange-500 px-4 py-3 font-bold text-white"
            >
              إنشاء حساب
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto flex max-w-6xl flex-col items-center px-5 py-20 text-center">
        <span className="rounded-full bg-orange-100 px-5 py-2 font-bold text-orange-700">
          أهلاً بك في خِدمتي
        </span>

        <h1 className="mt-8 text-4xl font-black leading-tight md:text-6xl">
          مهارتك تستحق
          <span className="block text-orange-500">التميز</span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-9 text-gray-600">
          اكتشف خدمات احترافية، واعثر على الشخص المناسب لإنجاز عملك،
          أو اعرض مهاراتك وابدأ رحلتك في عالم العمل الحر.
        </p>

        <div className="mt-9 flex flex-wrap justify-center gap-4">
          <Link
            href="/register"
            className="rounded-xl bg-orange-500 px-8 py-4 font-bold text-white shadow-lg"
          >
            ابدأ الآن
          </Link>
          <Link
            href="/services"
            className="rounded-xl border-2 border-[#14213d] px-8 py-4 font-bold"
          >
            تصفح الخدمات
          </Link>
        </div>

        <div className="mt-16 grid w-full gap-5 md:grid-cols-3">
          {[
            ["01", "اختر الخدمة", "اكتشف الخدمات التي تناسب احتياجاتك."],
            ["02", "اطلب بسهولة", "تواصل مع مقدم الخدمة وتابع طلبك."],
            ["03", "استلم عملك", "تابع التنفيذ حتى استلام الخدمة."],
          ].map(([number, title, description]) => (
            <div key={number} className="rounded-2xl bg-white p-8 shadow-sm">
              <div className="text-3xl font-black text-orange-500">{number}</div>
              <h2 className="mt-4 text-xl font-bold">{title}</h2>
              <p className="mt-3 text-gray-500">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t bg-white py-7 text-center text-gray-500">
        خِدمتي — مهارتك تستحق التميز
      </footer>
    </main>
  );
      }
