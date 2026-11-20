import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProviderPublicProfile({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await getCurrentUser();
  if (!viewer) redirect("/login");
  if (viewer.role !== "CUSTOMER" || viewer.status !== "ACTIVE") redirect(viewer.role === "SUPER_ADMIN" ? "/admin" : "/account");
  const { id } = await params;
  const provider = await prisma.user.findFirst({
    where: { id, role: "PROVIDER", status: "ACTIVE" },
    select: {
      id: true, displayName: true, createdAt: true,
      profile: { select: { avatarUrl: true, bio: true, skills: true } },
      services: {
        where: { status: "APPROVED" },
        select: { id: true, title: true, description: true, price: true, mediaUrls: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!provider) notFound();
  const initials = provider.displayName.trim().slice(0, 1) || "م";
  return <main dir="rtl" className="min-h-screen bg-[#f5f6f8]">
    <header className="bg-[#14213d] px-5 py-5 text-white"><div className="mx-auto flex max-w-5xl items-center justify-between"><Link href="/" className="text-2xl font-black text-orange-400">خِدمتي</Link><Link href="/services" className="font-bold">تصفح الخدمات</Link></div></header>
    <section className="mx-auto max-w-5xl px-5 py-9">
      <Link href="/services" className="font-bold text-orange-600">← العودة للخدمات</Link>
      <article className="mt-6 overflow-hidden rounded-3xl bg-white shadow-sm">
        <div className="bg-[#14213d] px-6 py-9 text-white md:px-10">
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-right">
            {provider.profile?.avatarUrl ? <img src={provider.profile.avatarUrl} alt={provider.displayName} className="h-28 w-28 rounded-full border-4 border-white/20 object-cover"/> : <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-white/20 bg-orange-500 text-4xl font-black">{initials}</div>}
            <div className="min-w-0"><span className="text-sm font-bold text-orange-300">ملف مقدم الخدمة</span><h1 className="mt-2 text-3xl font-black">{provider.displayName}</h1><p className="mt-2 text-sm text-slate-300">عضو في خِدمتي منذ {provider.createdAt.toLocaleDateString("ar-EG")}</p></div>
          </div>
        </div>
        <div className="p-6 md:p-10">
          <section><h2 className="text-xl font-black text-[#14213d]">نبذة عن مقدم الخدمة</h2><p className="mt-3 whitespace-pre-wrap leading-8 text-slate-600">{provider.profile?.bio || "لم يضف مقدم الخدمة نبذة تعريفية بعد."}</p></section>
          <section className="mt-7"><h2 className="text-xl font-black text-[#14213d]">المهارات والتخصصات</h2><div className="mt-3 flex flex-wrap gap-2">{provider.profile?.skills?.length ? provider.profile.skills.map(skill => <span key={skill} className="rounded-full bg-orange-50 px-4 py-2 text-sm font-bold text-orange-700">{skill}</span>) : <p className="text-sm text-slate-500">لم تتم إضافة مهارات بعد.</p>}</div></section>
          <section className="mt-9"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-black text-[#14213d]">أعمالي وخدماتي</h2><span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">{provider.services.length.toLocaleString("en-US")} خدمة معتمدة</span></div>
            {provider.services.length ? <div className="mt-5 grid gap-5 sm:grid-cols-2">{provider.services.map(service => <article key={service.id} className="overflow-hidden rounded-2xl border border-slate-100 bg-white"><div className="h-44 bg-slate-100">{service.mediaUrls[0] ? (/\.(mp4|webm|mov)(\?|$)/i.test(service.mediaUrls[0]) ? <video src={service.mediaUrls[0]} controls preload="none" playsInline className="h-full w-full object-cover"/> : <img src={service.mediaUrls[0]} alt={service.title} loading="lazy" className="h-full w-full object-cover"/>) : <div className="flex h-full items-center justify-center text-sm text-slate-400">لا توجد صورة</div>}</div><div className="p-5"><h3 className="text-lg font-black text-[#14213d]">{service.title}</h3><p className="mt-2 text-sm leading-7 text-slate-500">{service.description.length > 120 ? service.description.slice(0,120)+"..." : service.description}</p><div className="mt-4 flex items-center justify-between gap-3"><strong className="text-lg text-orange-600">{service.price.toLocaleString("en-US")} EG</strong><Link href={`/services/${service.id}`} className="rounded-xl bg-[#14213d] px-4 py-3 text-sm font-bold text-white">عرض الخدمة</Link></div></div></article>)}</div> : <div className="mt-5 rounded-2xl bg-slate-50 p-8 text-center text-slate-500">لا توجد خدمات معتمدة منشورة حاليًا.</div>}
          </section>
          <div className="mt-9 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5"><h2 className="font-black text-[#14213d]">التقييمات</h2><p className="mt-2 text-sm leading-7 text-slate-500">سيظهر هنا متوسط التقييم وآراء العملاء بعد تفعيل نظام تقييم الطلبات المكتملة.</p></div>
        </div>
      </article>
    </section>
  </main>;
}
