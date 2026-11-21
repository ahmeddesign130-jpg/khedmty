import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function updateSettings(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPER_ADMIN") redirect("/login");

  const rawRate = Number(formData.get("commissionRate"));
  if (!Number.isInteger(rawRate) || rawRate < 0 || rawRate > 50) redirect("/admin/settings?error=invalid_rate");

  await prisma.platformSettings.upsert({
    where: { id: "main" },
    update: { commissionRate: rawRate },
    create: { id: "main", commissionRate: rawRate },
  });
  await prisma.auditLog.create({
    data: { actorId: user.id, action: "PLATFORM_COMMISSION_UPDATED", targetId: "main", details: `نسبة عمولة المنصة أصبحت ${rawRate}%` },
  });
  redirect("/admin/settings?success=saved");
}

export default async function AdminSettingsPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPER_ADMIN") redirect("/login");
  const params = await searchParams;
  const settings = await prisma.platformSettings.findUnique({ where: { id: "main" } });
  const commissionRate = settings?.commissionRate ?? 20;

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-3xl">
        <a href="/admin" className="mb-6 inline-block font-bold text-orange-600">← العودة للوحة الإدارة</a>
        <h1 className="text-3xl font-black text-slate-900">إعدادات المنصة</h1>
        <p className="mb-8 mt-2 text-slate-500">إدارة نسبة حصة خِدمتي من السعر النهائي للخدمة</p>
        {params.success === "saved" && <div className="mb-5 rounded-xl bg-green-50 p-4 font-bold text-green-700">تم حفظ نسبة العمولة الجديدة. ستطبق على الطلبات الجديدة فقط.</div>}
        {params.error === "invalid_rate" && <div className="mb-5 rounded-xl bg-red-50 p-4 font-bold text-red-700">أدخل نسبة صحيحة من 0 إلى 50 بالمئة.</div>}
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-900">نسبة عمولة المنصة</h2>
          <p className="mb-5 mt-2 text-sm leading-7 text-slate-500">النسبة الافتراضية 20% من السعر النهائي الذي اعتمدته الإدارة. يحصل مقدم الخدمة على الـ80% المتبقية. تعديل النسبة لا يغير الطلبات القديمة.</p>
          <form action={updateSettings}>
            <label htmlFor="commissionRate" className="mb-2 block text-sm font-bold text-slate-700">حصة المنصة (%)</label>
            <input id="commissionRate" name="commissionRate" type="number" min="0" max="50" step="1" defaultValue={commissionRate} required className="w-full rounded-xl border border-slate-200 p-4 text-lg font-bold outline-none focus:border-orange-500" />
            <button type="submit" className="mt-5 w-full rounded-xl bg-orange-600 p-4 font-bold text-white transition hover:bg-orange-700">حفظ النسبة</button>
          </form>
        </section>
      </div>
    </main>
  );
}
