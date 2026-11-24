import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPER_ADMIN") redirect("/login");

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-3xl">
        <a href="/admin" className="mb-6 inline-block font-bold text-orange-600">← العودة للوحة الإدارة</a>
        <h1 className="text-3xl font-black text-slate-900">إعدادات المنصة</h1>
        <p className="mb-8 mt-2 text-slate-600">سياسة التسعير المعتمدة في خِدمتي</p>
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-900">تقسيم السعر النهائي</h2>
          <p className="mt-3 text-sm leading-7 text-slate-700">يعتمد الأدمن السعر الإجمالي النهائي لكل خدمة عند مراجعتها. تُحسب حصة خِدمتي بنسبة ثابتة 20% من الإجمالي، ويكون صافي مقدم الخدمة 80%. لا يمكن تغيير النسبة من هذه الصفحة.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4"><p className="text-sm text-slate-600">الإجمالي</p><p className="mt-2 text-2xl font-black text-[#14213d]">100 EG</p></div>
            <div className="rounded-xl bg-orange-50 p-4"><p className="text-sm text-orange-900">حصة خِدمتي</p><p className="mt-2 text-2xl font-black text-orange-800">20 EG</p></div>
            <div className="rounded-xl bg-slate-50 p-4"><p className="text-sm text-slate-600">صافي المقدم</p><p className="mt-2 text-2xl font-black text-[#14213d]">80 EG</p></div>
          </div>
          <p className="mt-5 text-sm leading-7 text-slate-600">يُحفظ تقسيم السعر كلقطة ثابتة عند إنشاء الطلب؛ أي تغيير لاحق في سعر الخدمة لا يغيّر الطلبات القديمة.</p>
        </section>
      </div>
    </main>
  );
}
