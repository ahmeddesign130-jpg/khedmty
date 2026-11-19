import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = await searchParams;
  const searchTerm = (query.q || "").trim().slice(0, 80);
  const viewer = await getCurrentUser();
  if (!viewer) redirect("/login");
  if (viewer.role !== "CUSTOMER" || viewer.status !== "ACTIVE") {
    redirect(viewer.role === "SUPER_ADMIN" ? "/admin" : viewer.role === "PROVIDER" ? "/provider" : "/login");
  }
  const services = await prisma.service.findMany({
    where: {
      status: "APPROVED",
      ...(searchTerm ? { OR: [
        { title: { contains: searchTerm, mode: "insensitive" as const } },
        { description: { contains: searchTerm, mode: "insensitive" as const } },
      ] } : {}),
    },
    select: {
      id: true,
      title: true,
      description: true,
      price: true,
      mediaUrls: true,
      provider: {
        select: {
          displayName: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main dir="rtl" className="min-h-screen bg-[#f5f6f8]">
      <header className="bg-[#14213d] px-5 py-5 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="text-2xl font-black text-orange-400">
            خِدمتي
          </Link>


        </div>
      </header>

      <section className="bg-[#14213d] px-5 pb-12 pt-8 text-white">
        <div className="mx-auto max-w-6xl">
          <span className="font-bold text-orange-400">
            خِدمتي — مهارتك تستحق التميز
          </span>

          <h1 className="mt-4 text-3xl font-black md:text-5xl">
            اكتشف الخدمات التي تناسبك
          </h1>

          <p className="mt-4 max-w-2xl leading-8 text-slate-300">
            اختَر الخدمة واطلبها من خلال خِدمتي، وتابع التنفيذ والتسليم بأمان من حسابك.
          </p>

          <form action="/services" method="GET" className="mt-7 flex max-w-2xl flex-col gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 sm:flex-row">
            <label htmlFor="serviceSearch" className="sr-only">ابحث باسم الخدمة أو نوعها</label>
            <input id="serviceSearch" name="q" defaultValue={searchTerm} placeholder="مثال: صنع فيديو، تصميم شعار، كتابة محتوى..." dir="rtl" autoComplete="off" className="min-w-0 flex-1 rounded-xl border border-white/20 bg-white px-4 py-3 text-right font-semibold text-[#14213d] outline-none placeholder:text-slate-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-300" />
            <button type="submit" className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-6 py-3 font-black text-white shadow-lg transition hover:bg-orange-400">بحث عن الخدمة</button>
            {searchTerm && <Link href="/services" className="inline-flex items-center justify-center rounded-xl border border-white/30 px-4 py-3 font-bold text-white">عرض كل الخدمات</Link>}
          </form>
          <div className="mt-4 inline-flex rounded-xl bg-white/10 px-5 py-3">
            <span className="font-bold">
              {services.length.toLocaleString("en-US")} {searchTerm ? "نتيجة بحث" : "خدمة متاحة"}
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-10">
        {services.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <div className="text-4xl">✦</div>
            <h2 className="mt-4 text-xl font-black text-[#14213d]">
              {searchTerm ? `لم نعثر على خدمة باسم أو وصف يحتوي على «${searchTerm}».` : "لا توجد خدمات متاحة حاليًا"}
            </h2>
            <p className="mt-3 text-gray-500">
              {searchTerm ? "جرّب كلمات بحث أخرى مثل صنع فيديو أو تصميم شعار." : "نعمل على إضافة خدمات جديدة قريبًا."}
            </p>
            <Link
              href="/"
              className="mt-6 inline-block rounded-xl bg-orange-500 px-6 py-3 font-bold text-white"
            >
              العودة للرئيسية
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <article
                key={service.id}
                className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="h-48 overflow-hidden bg-slate-100">
                  {service.mediaUrls[0] ? ( /\.(mp4|webm|mov)(\?|$)/i.test(service.mediaUrls[0]) ? <video src={service.mediaUrls[0]} controls className="h-full w-full object-cover"/> : <img src={service.mediaUrls[0]} alt={service.title} className="h-full w-full object-cover"/>) : <div className="flex h-full items-center justify-center text-sm font-bold text-slate-400">لا توجد صورة للخدمة</div>}
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-lg font-black text-[#14213d]">
                      {service.title}
                    </h2>

                  </div>

                  <p className="mt-3 min-h-20 whitespace-pre-wrap text-sm leading-7 text-gray-500">
                    {service.description.length > 130
                      ? service.description.slice(0, 130) + "..."
                      : service.description}
                  </p>

                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <p className="text-xs text-gray-400">
                      مقدم الخدمة
                    </p>
                    <p className="mt-1 font-bold text-gray-700">
                      {service.provider.displayName}
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-gray-400">
                        سعر الخدمة
                      </p>
                      <p className="text-xl font-black text-orange-600">
                        {service.price.toLocaleString("en-US")} EG
                      </p>
                    </div>

                    <Link
                      href={`/services/${service.id}`}
                      className="rounded-xl bg-[#14213d] px-4 py-3 text-sm font-bold text-white transition hover:bg-orange-500"
                    >
                      عرض الخدمة
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
