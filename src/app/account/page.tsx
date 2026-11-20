import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UiIcon } from "@/components/ui-icon";
import { encryptProviderApplication } from "@/lib/provider-application";

async function applyAsProvider(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE" || user.role !== "CUSTOMER") redirect("/login");
  const fullName = String(formData.get("fullName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const nationalId = String(formData.get("nationalId") || "").replace(/\\D/g, "");
  const profession = String(formData.get("profession") || "").trim();
  const experience = String(formData.get("experience") || "").trim();
  const bio = String(formData.get("bio") || "").trim();
  if (fullName.length < 3 || fullName.length > 100 || !/^01[0125][0-9]{8}$/.test(phone) ||
      !/^[0-9]{14}$/.test(nationalId) || profession.length < 2 || profession.length > 80 ||
      experience.length > 500 || bio.length < 20 || bio.length > 1000) {
    redirect("/account?providerError=invalid");
  }
  const latest = await prisma.auditLog.findFirst({
    where: { targetId: user.id, action: { in: ["PROVIDER_APPLICATION_SUBMITTED", "PROVIDER_APPLICATION_REJECTED", "PROVIDER_APPLICATION_APPROVED"] } },
    orderBy: { createdAt: "desc" },
    select: { action: true },
  });
  if (latest?.action === "PROVIDER_APPLICATION_SUBMITTED") redirect("/account?providerStatus=pending");
  const encrypted = encryptProviderApplication({ fullName, phone, nationalId, profession, experience, bio });
  await prisma.auditLog.create({
    data: { actorId: user.id, targetId: user.id, action: "PROVIDER_APPLICATION_SUBMITTED", details: encrypted },
  });
  revalidatePath("/account");
  revalidatePath("/admin/providers");
  redirect("/account?providerStatus=pending");
}

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ providerStatus?: string; providerError?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "SUPER_ADMIN") redirect("/admin");
  if (user.role === "PROVIDER") { if (user.status === "PENDING") redirect("/pending"); redirect("/provider"); }
  const params = await searchParams;
  const events = await prisma.auditLog.findMany({
    where: { targetId: user.id, action: { in: ["PROVIDER_APPLICATION_SUBMITTED", "PROVIDER_APPLICATION_REJECTED", "PROVIDER_APPLICATION_APPROVED"] } },
    orderBy: { createdAt: "desc" }, take: 2, select: { action: true, details: true, createdAt: true },
  });
  const latest = events[0];
  const rejection = latest?.action === "PROVIDER_APPLICATION_REJECTED" ? latest.details : null;
  const applicationPending = latest?.action === "PROVIDER_APPLICATION_SUBMITTED";
  return <main dir="rtl" className="min-h-screen bg-[#f7f8fa]">
    <header className="bg-white shadow-sm"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
      <Link href="/" className="text-2xl font-black text-orange-500">خِدمتي</Link>
      <div className="flex items-center gap-2"><a href="/settings" aria-label="الإعدادات" title="الإعدادات" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 font-bold text-[#14213d] hover:bg-orange-50"><UiIcon name="settings" size={19}/><span className="hidden sm:inline">الإعدادات</span></a><form action="/api/auth/logout" method="POST"><button className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-bold"><UiIcon name="log-out" size={18}/> تسجيل الخروج</button></form></div>
    </div></header>
    <section className="mx-auto max-w-6xl px-5 py-12">
      <div className="relative overflow-hidden rounded-3xl bg-[#14213d] p-8 text-white shadow-xl">
        <div className="absolute -left-12 -top-16 h-48 w-48 rounded-full bg-orange-500/20 blur-3xl"/>
        <div className="relative"><span className="ui-icon-tile ui-icon-tile-dark"><UiIcon name="user" size={28}/></span>
          <p className="mt-4 text-orange-300">مرحبًا بك في خِدمتي</p><h1 className="mt-2 text-3xl font-black">حساب العميل</h1>
          <p className="mt-3 text-gray-300">تابع مشترياتك ومدفوعاتك، واوصل للخدمة اللي تناسب احتياجك من حساب واحد.</p>
        </div>
      </div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <Link href="/services" className="group rounded-2xl border border-gray-100 bg-white p-7 shadow-sm">
          <span className="ui-icon-tile"><UiIcon name="search" size={27}/></span><h2 className="mt-5 text-xl font-black">تصفح الخدمات</h2>
          <p className="mt-3 text-gray-500">دوّر على الخدمة باسمها أو نوعها، وقارن التفاصيل قبل ما تختار.</p>
          <span className="mt-5 inline-flex items-center gap-2 font-bold text-orange-500">استكشف الخدمات <UiIcon name="arrow-left" size={17}/></span>
        </Link>
        <Link href="/orders" className="group rounded-2xl border border-gray-100 bg-white p-7 shadow-sm">
          <span className="ui-icon-tile"><UiIcon name="shopping-bag" size={27}/></span><h2 className="mt-5 text-xl font-black">طلباتي</h2>
          <p className="mt-3 text-gray-500">اعرف كل طلب وصل لفين، وراجع تفاصيله ومدفوعاته في أي وقت.</p>
          <span className="mt-5 inline-flex items-center gap-2 font-bold text-orange-500">عرض الطلبات <UiIcon name="arrow-left" size={17}/></span>
        </Link>
      </div>
      <section id="provider-application" className="mt-8 rounded-3xl border border-orange-100 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-3"><span className="ui-icon-tile"><UiIcon name="briefcase-business" size={25}/></span><div><h2 className="text-xl font-black text-[#14213d]">تغيير نوع الحساب إلى مقدم خدمة</h2><p className="mt-2 text-sm leading-7 text-slate-600">قدّم بياناتك مرة واحدة. سيظل حسابك كعميل حتى تراجع الإدارة الطلب وتوافق عليه.</p></div></div>
        {rejection && <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900"><h3 className="font-black">تم رفض طلبك السابق</h3><p className="mt-2 leading-7">سبب الرفض: {rejection}</p><p className="mt-2 text-sm">يمكنك تعديل بياناتك وإرسال طلب جديد.</p></div>}
        {applicationPending && <div role="status" className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 font-bold text-amber-900">طلبك قيد المراجعة حاليًا. سنُفعّل حساب مقدم الخدمة بعد موافقة الإدارة.</div>}
        {params.providerStatus === "pending" && <p role="status" className="mt-4 rounded-xl bg-green-50 p-3 font-bold text-green-800">تم إرسال طلبك بنجاح وهو الآن قيد المراجعة.</p>}
        {params.providerError === "invalid" && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 font-bold text-red-800">راجع البيانات: رقم الهاتف المصري صحيح، والرقم القومي 14 رقمًا، والنبذة 20 حرفًا على الأقل.</p>}
        {!applicationPending && <form action={applyAsProvider} className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold text-slate-700">الاسم بالكامل<input name="fullName" required minLength={3} maxLength={100} className="mt-2 w-full rounded-xl border border-slate-200 p-3" placeholder="الاسم كما هو في البطاقة"/></label>
          <label className="text-sm font-bold text-slate-700">رقم الهاتف<input name="phone" type="tel" inputMode="numeric" required pattern="01[0125][0-9]{8}" maxLength={11} dir="ltr" className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-left" placeholder="01xxxxxxxxx"/></label>
          <label className="text-sm font-bold text-slate-700">الرقم القومي<input name="nationalId" type="password" inputMode="numeric" autoComplete="off" required pattern="[0-9]{14}" minLength={14} maxLength={14} dir="ltr" className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-left" placeholder="14 رقمًا — بيانات خاصة"/></label>
          <label className="text-sm font-bold text-slate-700">مجال الخدمة أو المهنة<input name="profession" required minLength={2} maxLength={80} className="mt-2 w-full rounded-xl border border-slate-200 p-3" placeholder="مثال: تصميم الجرافيك"/></label>
          <label className="text-sm font-bold text-slate-700 sm:col-span-2">الخبرة السابقة<textarea name="experience" maxLength={500} rows={2} className="mt-2 w-full rounded-xl border border-slate-200 p-3" placeholder="اذكر خبرتك وأمثلة على أعمالك"/></label>
          <label className="text-sm font-bold text-slate-700 sm:col-span-2">نبذة عنك ولماذا تريد الانضمام؟<textarea name="bio" required minLength={20} maxLength={1000} rows={4} className="mt-2 w-full rounded-xl border border-slate-200 p-3" placeholder="عرّفنا بنفسك وبالخدمات التي تستطيع تقديمها"/></label>
          <p className="text-xs leading-6 text-slate-500 sm:col-span-2">الرقم القومي مشفّر عند التخزين ولا يظهر للعملاء. يطلع عليه مسؤولو المنصة المخوّلون لمراجعة الطلب فقط.</p>
          <button type="submit" disabled={applicationPending} className="rounded-xl bg-orange-500 px-5 py-4 font-black text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600 sm:col-span-2">إرسال طلب التحويل لمقدم خدمة</button>
        </form>}
      </section>
    </section>
  </main>;
}
