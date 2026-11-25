import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SERVICE_CATEGORY_NAMES, getSubcategories } from "@/lib/service-categories";

export const dynamic = "force-dynamic";
type Search = { q?: string; category?: string; subcategory?: string; minPrice?: string; maxPrice?: string };
export default async function ServicesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const query = await searchParams;
  const searchTerm = (query.q || "").trim().slice(0, 80);
  const category = SERVICE_CATEGORY_NAMES.includes(query.category as never) ? query.category! : "";
  const subcategory = category && getSubcategories(category).includes(query.subcategory || "") ? query.subcategory! : "";
  const minPrice = query.minPrice && /^\d+$/.test(query.minPrice) ? Number(query.minPrice) : undefined;
  const maxPrice = query.maxPrice && /^\d+$/.test(query.maxPrice) ? Number(query.maxPrice) : undefined;
  const viewer = await getCurrentUser();
  if (!viewer) redirect("/login");
  if (viewer.role !== "CUSTOMER" || viewer.status !== "ACTIVE") redirect(viewer.role === "SUPER_ADMIN" ? "/admin" : viewer.role === "PROVIDER" ? "/provider" : "/login");
  const services = await prisma.service.findMany({
    where: {
      status: "APPROVED",
      ...(searchTerm ? { OR: [{ title: { contains: searchTerm, mode: "insensitive" as const } }, { serviceNo: { contains: searchTerm, mode: "insensitive" as const } }, { description: { contains: searchTerm, mode: "insensitive" as const } }] } : {}),
      ...(category ? { category } : {}),
      ...(subcategory ? { subcategory } : {}),
      ...(minPrice !== undefined || maxPrice !== undefined ? { price: { ...(minPrice !== undefined ? { gte: minPrice } : {}), ...(maxPrice !== undefined ? { lte: maxPrice } : {}) } } : {}),
    },
    select: { id: true, serviceNo: true, title: true, description: true, category: true, subcategory: true, price: true, mediaUrls: true, provider: { select: { displayName: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <main dir="rtl" className="min-h-screen bg-[#f5f6f8]">
      <header className="bg-[#14213d] px-5 py-5 text-white"><div className="mx-auto flex max-w-6xl items-center justify-between"><Link href="/" className="text-2xl font-black text-orange-400">خِدمتي</Link></div></header>
      <section className="bg-[#14213d] px-5 pb-10 pt-8 text-white"><div className="mx-auto max-w-6xl">
        <span className="font-bold text-orange-400">خِدمتي — مهارتك تستحق التميز</span>
        <h1 className="mt-4 text-3xl font-black md:text-5xl">اكتشف الخدمات التي تناسبك</h1>
        <p className="mt-4 max-w-2xl leading-8 text-slate-300">اختَر المجال والتخصص، وحدد السعر إذا أحببت. ترك السعر فارغًا يعرض كل الأسعار.</p>
        <form action="/services" method="GET" className="mt-7 grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-[#14213d] shadow-xl sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-sm font-extrabold text-[#14213d] lg:col-span-2">بحث بالاسم أو رقم الخدمة<input name="q" defaultValue={searchTerm} placeholder="مثال: تصميم شعار أو رقم الخدمة" className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 font-semibold text-[#14213d] placeholder:text-slate-500 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"/></label>
          <label className="text-sm font-extrabold text-[#14213d]">المجال الرئيسي<select name="category" defaultValue={category} className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 font-semibold text-[#14213d] focus:border-orange-500 focus:outline-none"><option value="">كل المجالات</option>{SERVICE_CATEGORY_NAMES.map(name=><option key={name} value={name}>{name}</option>)}</select></label>
          <label className="text-sm font-extrabold text-[#14213d]">التخصص الفرعي<select name="subcategory" defaultValue={subcategory} className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 font-semibold text-[#14213d] focus:border-orange-500 focus:outline-none"><option value="">كل التخصصات</option>{(category ? getSubcategories(category) : SERVICE_CATEGORY_NAMES.flatMap(getSubcategories)).map(name=><option key={name} value={name}>{name}</option>)}</select></label>
          <div className="grid grid-cols-2 gap-2 lg:col-span-2"><label className="text-sm font-extrabold text-[#14213d]">أقل سعر (EG)<input name="minPrice" type="number" min="0" defaultValue={query.minPrice || ""} placeholder="بدون حد" className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 font-semibold text-[#14213d] focus:border-orange-500 focus:outline-none"/></label><label className="text-sm font-extrabold text-[#14213d]">أعلى سعر (EG)<input name="maxPrice" type="number" min="0" defaultValue={query.maxPrice || ""} placeholder="بدون حد" className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 font-semibold text-[#14213d] focus:border-orange-500 focus:outline-none"/></label></div>
          <div className="flex items-end gap-2 lg:col-span-3"><button type="submit" className="flex-1 rounded-xl bg-orange-500 px-5 py-3 font-black text-white hover:bg-orange-400">تطبيق الفلاتر</button><Link href="/services" className="rounded-xl border border-slate-300 px-5 py-3 text-center font-bold text-[#14213d] hover:bg-slate-100">مسح الكل</Link></div>
        </form>
        <div className="mt-4 inline-flex rounded-xl bg-white/15 px-5 py-3 text-white"><span className="font-bold">{services.length.toLocaleString("en-US")} نتيجة</span></div>
      </div></section>
      <section className="mx-auto max-w-6xl px-5 py-10">
        {services.length === 0 ? <div className="rounded-2xl bg-white p-10 text-center shadow-sm"><h2 className="text-xl font-black text-[#14213d]">لا توجد خدمات مطابقة للفلاتر الحالية</h2><p className="mt-3 text-gray-500">جرّب إزالة السعر أو اختيار مجال أوسع.</p><Link href="/services" className="mt-6 inline-block rounded-xl bg-orange-500 px-6 py-3 font-bold text-white">عرض كل الخدمات</Link></div> :
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{services.map(service=><article key={service.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
          <div className="h-48 overflow-hidden bg-slate-100">{service.mediaUrls[0] ? (/\.(mp4|webm|mov)(\?|$)/i.test(service.mediaUrls[0]) ? <video src={service.mediaUrls[0]} aria-label={`معاينة فيديو الخدمة: ${service.title}`} controls preload="none" playsInline className="h-full w-full object-cover"/> : <img src={service.mediaUrls[0]} alt={service.title} loading="lazy" decoding="async" className="h-full w-full object-cover"/>) : <div className="flex h-full items-center justify-center text-sm font-bold text-slate-400">لا توجد صورة للخدمة</div>}</div>
          <div className="p-5"><div className="flex flex-wrap gap-2 text-xs font-bold text-orange-700"><span className="rounded-full bg-orange-50 px-3 py-1">{service.category}</span><span className="rounded-full bg-slate-100 px-3 py-1">{service.subcategory}</span></div>
            <h2 className="mt-3 text-lg font-black text-[#14213d]">{service.title}</h2><p className="mt-1 text-xs font-semibold text-slate-400">رقم الخدمة: {service.serviceNo}</p>
            <p className="mt-3 min-h-20 whitespace-pre-wrap text-sm leading-7 text-gray-500">{service.description.length > 130 ? service.description.slice(0,130)+"..." : service.description}</p>
            <div className="mt-4 border-t border-gray-100 pt-4"><p className="text-xs text-gray-400">مقدم الخدمة</p><p className="mt-1 font-bold text-gray-700">{service.provider.displayName}</p></div>
            <div className="mt-5 flex items-center justify-between gap-3"><div><p className="text-xs text-gray-400">السعر النهائي للعميل</p><p className="text-xl font-black text-orange-600">{service.price.toLocaleString("en-US")} EG</p></div><Link href={`/services/${service.id}`} className="rounded-xl bg-[#14213d] px-4 py-3 text-sm font-bold text-white transition hover:bg-orange-500">اطلب الخدمة</Link></div>
          </div></article>)}</div>}
      </section>
    </main>
  );
}