import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateOrderPricing } from "@/lib/pricing.mjs";
import ServiceCreateForm from "./ServiceCreateForm";

export const dynamic = "force-dynamic";

export default async function ProviderServicesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "PROVIDER") redirect("/account");
  if (user.status !== "ACTIVE") redirect("/pending");

  const [services, settings] = await Promise.all([
    prisma.service.findMany({ where: { providerId: user.id }, orderBy: { createdAt: "desc" } }),
    prisma.platformSettings.findUnique({ where: { id: "main" }, select: { commissionRate: true } }),
  ]);
  const commissionRate = settings?.commissionRate ?? 20;
  const status: Record<string, string> = {
    DRAFT: "مسودة",
    PENDING_REVIEW: "قيد المراجعة",
    APPROVED: "معتمدة",
    REJECTED: "مرفوضة",
    PAUSED: "متوقفة",
  };
  const money = (amount: number) => `${amount.toLocaleString("en-US")} EG`;

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-5 md:p-9">
      <section aria-labelledby="provider-services-title" className="mx-auto max-w-5xl">
        <Link href="/provider" className="font-bold text-orange-600">← لوحة مقدم الخدمة</Link>
        <h1 id="provider-services-title" className="mt-5 text-3xl font-black text-slate-900">خدماتي</h1>
        <ServiceCreateForm />
        <h2 className="mt-9 text-xl font-black">الخدمات المضافة ({services.length})</h2>
        <div className="mt-4 space-y-3">
          {services.map((service) => {
            const pricing = service.status === "APPROVED"
              ? calculateOrderPricing(service.price, commissionRate)
              : null;
            return (
              <article key={service.id} className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <strong>{service.title}</strong>
                  <span className="text-sm font-bold text-orange-600">{status[service.status]}</span>
                </div>
                {service.reviewNote && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm leading-6 text-red-700">ملاحظة الإدارة: {service.reviewNote}</p>}
                {pricing ? (
                  <div className="mt-3 space-y-1 text-sm">
                    <p className="text-slate-600">السعر النهائي للعميل: <strong>{money(pricing.total)}</strong></p>
                    <p className="font-black text-[#14213d]">صافي مستحقاتك: {money(pricing.providerNet)}</p>
                    <p className="text-xs text-slate-500">حصة خِدمتي: {money(pricing.commission)} ({pricing.commissionRate}%)</p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">السعر المقترح منك: {money(service.price)} — السعر النهائي يحدده الأدمن عند الاعتماد.</p>
                )}
                {service.mediaUrls.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {service.mediaUrls.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer" className="text-sm font-bold text-orange-600">فتح الملف {index + 1}</a>)}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
