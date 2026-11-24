import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateOrderPricing } from "@/lib/pricing.mjs";

export const dynamic = "force-dynamic";

export default async function ServiceDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const viewer = await getCurrentUser();
  if (!viewer) redirect("/login");
  if (viewer.role !== "CUSTOMER" || viewer.status !== "ACTIVE") {
    redirect(viewer.role === "SUPER_ADMIN" ? "/admin" : viewer.role === "PROVIDER" ? "/provider" : "/login");
  }

  const service = await prisma.service.findUnique({
    where: { id },
    include: {
      provider: {
        select: {
          displayName: true,
        },
      },
    },
  });

  if (!service || service.status !== "APPROVED") {
    notFound();
  }

  const serviceRequirements = service.requirements;

  async function createOrder(formData: FormData) {
    "use server";

    const user = await getCurrentUser();

    if (!user) redirect("/login");

    if (user.role !== "CUSTOMER" || user.status !== "ACTIVE") {
      redirect("/account");
    }

    const customerContact = String(formData.get("customerContact") || "").trim();
    if (customerContact.length < 5 || customerContact.length > 160) {
      redirect(`/services/${id}?error=contact`);
    }

    const requirementAnswers = serviceRequirements.map((question, index) => ({ question, answer: String(formData.get(`requirement_${index}`) || "").trim() }));
    if (requirementAnswers.some((item) => item.answer.length < 2 || item.answer.length > 1500)) redirect(`/services/${id}?error=requirements`);

    let orderId: string;

    try {
      orderId = await prisma.$transaction(async (tx) => {
        const [completedCount, activeCount] = await Promise.all([
          tx.order.count({ where: { customerId: user.id, status: "COMPLETED" } }),
          tx.order.count({ where: { customerId: user.id, status: { notIn: ["COMPLETED", "CANCELLED", "REJECTED"] } } }),
        ]);
        const capacity = 5 + Math.floor(completedCount / 5) * 5;
        if (activeCount >= capacity) throw new Error("ORDER_CAPACITY_REACHED");
        // Re-read all purchase-critical data together so the order uses
        // the current approved service, active provider, and commission.
        const currentService = await tx.service.findUnique({
          where: { id },
          select: {
            id: true,
            price: true,
            providerId: true,
            status: true,
            provider: { select: { status: true } },
          },
        });

        if (
          !currentService ||
          currentService.status !== "APPROVED" ||
          currentService.provider.status !== "ACTIVE" ||
          currentService.providerId === user.id
        ) {
          throw new Error("SERVICE_NOT_AVAILABLE");
        }

        const settings = await tx.platformSettings.findUnique({
          where: { id: "main" },
          select: { commissionRate: true },
        });
        const pricing = calculateOrderPricing(currentService.price, settings?.commissionRate ?? 20);

        const order = await tx.order.create({
          data: {
            orderNo: `KH-${Date.now()}-${crypto.randomUUID()
              .slice(0, 6)
              .toUpperCase()}`,
            serviceId: currentService.id,
            customerId: user.id,
            customerContact,
            requirementsAnswers: requirementAnswers.length ? JSON.stringify(requirementAnswers) : null,
            providerId: currentService.providerId,
            ...pricing,
            status: "PENDING_PAYMENT",
          },
          select: { id: true },
        });

        return order.id;
      }, { isolationLevel: "Serializable" });
    } catch (error) {
      if (error instanceof Error && error.message === "ORDER_CAPACITY_REACHED") {
        redirect(`/services/${id}?error=capacity`);
      }
      if (error instanceof Error && error.message === "SERVICE_NOT_AVAILABLE") {
        redirect("/services");
      }
      throw error;
    }

    redirect(`/orders/${orderId}`);
  }

  const total = service.price;

  return (
    <main dir="rtl" className="min-h-screen bg-[#f5f6f8]">
      <header className="bg-[#14213d] px-5 py-5 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="text-2xl font-black text-orange-400">
            خِدمتي
          </Link>
          <Link href="/services" className="font-bold">
            جميع الخدمات
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-10">
        <Link
          href="/services"
          className="font-bold text-orange-600"
        >
          ← العودة للخدمات
        </Link>

        <article className="mt-6 overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="grid gap-2 bg-slate-100 sm:grid-cols-2">
            {service.mediaUrls.length ? service.mediaUrls.map((url,index)=> /\.(mp4|webm|mov)(\?|$)/i.test(url) ? <video key={url} src={url} aria-label={`فيديو ${service.title} رقم ${index+1}`} controls preload="none" playsInline className="max-h-[420px] w-full bg-black object-contain"/> : <img key={url} src={url} alt={`${service.title} - ${index+1}`} loading={index === 0 ? "eager" : "lazy"} decoding="async" fetchPriority={index === 0 ? "high" : "low"} className="max-h-[420px] w-full object-contain"/>) : <div className="flex h-44 items-center justify-center text-slate-400">لا توجد صور مرفقة</div>}
          </div>

          <div className="p-6 md:p-10">

            <h1 className="mt-5 text-3xl font-black text-[#14213d]">
              {service.title}
            </h1>

            <div className="mt-6 rounded-2xl bg-slate-50 p-5">
              <p className="font-bold text-slate-700">
                وصف الخدمة
              </p>
              <p className="mt-3 whitespace-pre-wrap leading-8 text-slate-600">
                {service.description}
              </p>
            </div>

            {service.requirements.length > 0 && <div className="mt-6 rounded-2xl border border-orange-100 bg-orange-50/50 p-5"><h2 className="font-black text-[#14213d]">المعلومات المطلوبة لتنفيذ الخدمة</h2><ul className="mt-3 list-inside list-disc space-y-2 text-sm leading-7 text-slate-600">{service.requirements.map((item) => <li key={item}>{item}</li>)}</ul></div>}
            <div className="mt-6 rounded-2xl border border-slate-100 p-5"><p className="text-sm text-slate-500">مقدم الخدمة</p><p className="mt-2 text-lg font-black text-[#14213d]">{service.provider.displayName}</p></div>

            <div className="mt-6 rounded-2xl bg-[#14213d] p-6 text-white">
              <h2 className="text-xl font-black">
                تفاصيل السعر
              </h2>

              <div className="mt-5 space-y-3 text-sm">
                <div className="border-t border-white/20 pt-4">
                  <div className="flex justify-between gap-3">
                    <span className="font-bold">الإجمالي المطلوب</span>
                    <span className="text-2xl font-black text-orange-400">
                      {total.toLocaleString("en-US")} EG
                    </span>
                  </div>
                </div>
              </div>

              {query.error === "requirements" && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">جاوب عن كل المتطلبات المطلوبة قبل إنشاء الطلب.</p>}
              {query.error === "contact" && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">اكتب وسيلة تواصل صحيحة قبل إنشاء الطلب.</p>}
              {query.error === "capacity" && <p role="alert" className="mb-4 rounded-xl bg-orange-50 p-3 text-sm font-bold text-orange-800">اكتملت الأماكن المتاحة لطلباتك. أكمل طلبًا جاريًا أولًا حتى يتوفر مكان جديد.</p>}
              <form action={createOrder}>
                {service.requirements.map((item, index) => <label key={item} className="mb-4 block text-sm font-bold text-slate-700">{item}<textarea name={`requirement_${index}`} required minLength={2} maxLength={1500} rows={3} placeholder="اكتب التفاصيل المطلوبة هنا" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" /></label>)}
                <label className="mb-5 block text-sm font-bold text-slate-700">طريقة التواصل معك (هاتف أو واتساب أو بريد إلكتروني)
                  <input name="customerContact" required minLength={5} maxLength={160} placeholder="اكتب رقمك أو بريدك للتواصل" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" dir="auto" />
                </label>
                <button
                  type="submit"
                  className="mt-7 w-full rounded-xl bg-orange-500 px-6 py-4 font-black text-white transition hover:bg-orange-600"
                >
                  اطلب الخدمة الآن
                </button>
              </form>

              <p className="mt-4 text-center text-xs leading-6 text-slate-300">
                لن يتم اعتماد الدفع إلا بعد مراجعة الإدارة والتحقق من وصول المبلغ. لا يبدأ التواصل مع مقدم الخدمة إلا بعد تأكيد الدفع.
              </p>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
        }
