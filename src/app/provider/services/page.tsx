import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function createService(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user || user.role !== "PROVIDER" || user.status !== "ACTIVE") redirect("/login");
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const price = Number(formData.get("price"));
  if (title.length < 5 || title.length > 120 || description.length < 20 || description.length > 5000 || !Number.isSafeInteger(price) || price < 1) redirect("/provider/services?error=invalid");
  await prisma.service.create({ data: {
    title, description, price, providerId: user.id, status: "PENDING_REVIEW",
    serviceNo: `KH-SRV-${crypto.randomUUID().replace(/-/g,"").slice(0,12).toUpperCase()}`
  }});
  revalidatePath("/provider/services");
  redirect("/provider/services?created=1");
}

export default async function ProviderServicesPage({searchParams}:{searchParams:Promise<{created?:string;error?:string}>}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "PROVIDER") redirect("/account");
  if (user.status !== "ACTIVE") redirect("/pending");
  const params = await searchParams;
  const services = await prisma.service.findMany({ where:{providerId:user.id}, orderBy:{createdAt:"desc"} });
  const status:Record<string,string> = {DRAFT:"مسودة",PENDING_REVIEW:"قيد المراجعة",APPROVED:"معتمدة",REJECTED:"مرفوضة",PAUSED:"متوقفة"};
  return <main dir="rtl" className="min-h-screen bg-slate-50 p-5 md:p-9"><div className="mx-auto max-w-5xl">
    <Link href="/provider" className="font-bold text-orange-600">← لوحة مقدم الخدمة</Link>
    <h1 className="mt-5 text-3xl font-black text-slate-900">خدماتي</h1>
    {params.created && <p className="mt-4 rounded-xl bg-green-50 p-4 font-bold text-green-700">تم إرسال الخدمة للمراجعة بنجاح.</p>}
    {params.error && <p className="mt-4 rounded-xl bg-red-50 p-4 font-bold text-red-700">راجع العنوان والوصف والسعر. الوصف لا يقل عن 20 حرفًا.</p>}
    <form action={createService} className="mt-7 space-y-4 rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black">إضافة خدمة جديدة</h2>
      <label className="block text-sm font-bold">عنوان الخدمة<input name="title" required minLength={5} maxLength={120} className="mt-2 w-full rounded-xl border p-3" /></label>
      <label className="block text-sm font-bold">وصف الخدمة<textarea name="description" required minLength={20} maxLength={5000} rows={5} className="mt-2 w-full rounded-xl border p-3" /></label>
      <label className="block text-sm font-bold">السعر (EG)<input name="price" type="number" min="1" step="1" required className="mt-2 w-full rounded-xl border p-3" /></label>
      <button className="w-full rounded-xl bg-orange-500 p-4 font-black text-white">إرسال الخدمة للمراجعة</button>
      <p className="text-xs leading-6 text-slate-500">يتم نشر الخدمة بعد موافقة الإدارة. رفع الصور والفيديو غير مفعّل حاليًا في التخزين.</p>
    </form>
    <h2 className="mt-9 text-xl font-black">الخدمات المضافة ({services.length})</h2>
    <div className="mt-4 space-y-3">{services.map(s=><article key={s.id} className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex flex-wrap justify-between gap-2"><strong>{s.title}</strong><span className="text-sm font-bold text-orange-600">{status[s.status]}</span></div><p className="mt-2 text-sm text-slate-500">{s.serviceNo}</p><p className="mt-2 font-black">{s.price.toLocaleString("en-US")} EG</p></article>)}</div>
  </div></main>;
}
