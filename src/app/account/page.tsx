import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AccountPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role === "SUPER_ADMIN") redirect("/admin");
  if (user.role === "PROVIDER") {
    if (user.status === "PENDING") redirect("/pending");
    redirect("/provider");
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#f7f8fa]">
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <Link href="/" className="text-2xl font-black text-orange-500">
            خِدمتي
          </Link>
          <form action="/api/auth/logout" method="POST">
            <button className="rounded-xl border px-4 py-2 font-bold">
              تسجيل الخروج
            </button>
          </form>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-12">
        <div className="rounded-3xl bg-[#14213d] p-8 text-white">
          <p className="text-orange-300">مرحبًا بك في خِدمتي</p>
          <h1 className="mt-3 text-3xl font-black">حساب العميل</h1>
          <p className="mt-3 text-gray-300">
            من هنا تقدر تكتشف الخدمات وتتابع طلباتك.
          </p>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <Link href="/services" className="rounded-2xl bg-white p-7 shadow-sm">
            <h2 className="text-xl font-black">تصفح الخدمات</h2>
            <p className="mt-3 text-gray-500">
              اكتشف الخدمات المتاحة واختر الخدمة المناسبة.
            </p>
            <span className="mt-5 block font-bold text-orange-500">
              استكشف الخدمات ←
            </span>
          </Link>

          <Link href="/orders" className="rounded-2xl bg-white p-7 shadow-sm">
            <h2 className="text-xl font-black">طلباتي</h2>
            <p className="mt-3 text-gray-500">
              تابع حالة طلباتك وعمليات الشراء.
            </p>
            <span className="mt-5 block font-bold text-orange-500">
              عرض الطلبات ←
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}
