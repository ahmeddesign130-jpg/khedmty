
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role !== "SUPER_ADMIN") redirect("/account");

  const sections = [
    {
      number: "01",
      title: "مراجعة مقدمي الخدمات",
      description: "مراجعة الحسابات الجديدة والموافقة عليها أو رفضها.",
      href: "/admin/providers",
    },
    {
      number: "02",
      title: "مراجعة الخدمات",
      description: "مراجعة الخدمات المقدمة قبل ظهورها للعملاء.",
      href: "/admin/services",
    },
    {
      number: "03",
      title: "إدارة الطلبات",
      description: "متابعة طلبات العملاء ومقدمي الخدمات.",
      href: "/admin/orders",
    },
    {
      number: "04",
      title: "مراجعة المدفوعات",
      description: "مراجعة إيصالات التحويل واعتماد المدفوعات.",
      href: "/admin/payments",
    },
    {
      number: "05",
      title: "إعدادات المنصة",
      description: "إدارة نسبة العمولة وإعدادات خِدمتي.",
      href: "/admin/settings",
    },
  ];

  return (
    <main dir="rtl" className="min-h-screen bg-[#f5f6f8]">
      <aside className="bg-[#14213d] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6">
          <Link href="/" className="text-3xl font-black text-orange-400">
            خِدمتي
          </Link>

          <form action="/api/auth/logout" method="POST">
            <button className="rounded-xl border border-white/30 px-4 py-2 text-sm font-bold">
              تسجيل الخروج
            </button>
          </form>
        </div>
      </aside>

      <section className="mx-auto max-w-7xl px-5 py-10">
        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <p className="font-bold text-orange-500">لوحة الإدارة</p>
          <h1 className="mt-3 text-3xl font-black text-[#14213d]">
            مرحبًا بك في إدارة خِدمتي
          </h1>
          <p className="mt-4 leading-8 text-gray-500">
            من هنا يمكنك إدارة المنصة ومراجعة الحسابات والخدمات
            والطلبات والمدفوعات.
          </p>
        </div>

        <h2 className="mb-5 mt-10 text-2xl font-black text-[#14213d]">
          أقسام الإدارة
        </h2>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => (
            <Link
              key={section.number}
              href={section.href}
              className="rounded-2xl border border-gray-100 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <span className="text-3xl font-black text-orange-500">
                {section.number}
              </span>
              <h3 className="mt-5 text-xl font-black text-[#14213d]">
                {section.title}
              </h3>
              <p className="mt-3 leading-7 text-gray-500">
                {section.description}
              </p>
              <span className="mt-6 block font-bold text-orange-500">
                فتح القسم ←
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
