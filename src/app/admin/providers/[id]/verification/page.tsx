import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptProviderApplication } from "@/lib/provider-application";
import { createStorageDownload } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function ProviderVerificationReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "SUPER_ADMIN") redirect("/login");
  const { id } = await params;
  const provider = await prisma.user.findFirst({
    where: { id, OR: [{ role: "PROVIDER", status: "PENDING" }, { role: "CUSTOMER", status: "ACTIVE" }] },
    select: { id: true, email: true, displayName: true, createdAt: true, profile: { select: { phone: true } } },
  });
  if (!provider) notFound();
  const submission = await prisma.auditLog.findFirst({
    where: { targetId: id, action: "PROVIDER_APPLICATION_SUBMITTED" },
    orderBy: { createdAt: "desc" },
    select: { details: true, createdAt: true },
  });
  const latestReview = await prisma.auditLog.findFirst({
    where: { targetId: id, action: { in: ["PROVIDER_APPLICATION_REJECTED", "PROVIDER_APPLICATION_APPROVED"] } },
    orderBy: { createdAt: "desc" }, select: { createdAt: true },
  });
  if (!submission || (latestReview && latestReview.createdAt > submission.createdAt)) {
    return <main dir="rtl" className="min-h-screen bg-slate-50 p-6"><section className="mx-auto max-w-3xl rounded-2xl bg-white p-7"><Link href="/admin/providers" className="font-bold text-orange-600">العودة لمقدمي الخدمات</Link><h1 className="mt-6 text-2xl font-black">لا توجد بيانات تحقق حديثة</h1><p className="mt-3 leading-8 text-slate-600">لا يمكن اعتماد هذا الحساب قبل أن يرسل مقدم الخدمة نموذج التحقق وصور البطاقة.</p></section></main>;
  }
  const data = submission.details ? decryptProviderApplication(submission.details) : null;
  if (!data) return <main dir="rtl" className="p-8">تعذر فك تشفير بيانات الطلب. لا تعتمد الحساب.</main>;
  const frontPath = data.idFrontPath && data.idFrontPath.startsWith(id + "/verification/") ? data.idFrontPath : "";
  const backPath = data.idBackPath && data.idBackPath.startsWith(id + "/verification/") ? data.idBackPath : "";
  const [frontUrl, backUrl] = await Promise.all([
    frontPath ? createStorageDownload("provider-verification", frontPath, 900) : null,
    backPath ? createStorageDownload("provider-verification", backPath, 900) : null,
  ]);

  const documentsComplete = Boolean(frontUrl && backUrl && data.idFrontPath && data.idBackPath && data.dateOfBirth);\n\n  async function review(formData: FormData) {
    "use server";
    const currentAdmin = await getCurrentUser();
    if (!currentAdmin || currentAdmin.role !== "SUPER_ADMIN") redirect("/login");
    const action = String(formData.get("action") || "");
    const reason = String(formData.get("reason") || "").trim();
    if (!["APPROVE", "REJECT"].includes(action) || (action === "REJECT" && (reason.length < 3 || reason.length > 1000))) redirect("/admin/providers/" + id + "/verification?error=invalid");\n    if (action === "APPROVE" && (!data.idFrontPath || !data.idBackPath || !data.dateOfBirth)) redirect("/admin/providers/" + id + "/verification?error=missing-documents");
    const latestRequest = await prisma.auditLog.findFirst({
      where: { targetId: id, action: "PROVIDER_APPLICATION_SUBMITTED" },
      orderBy: { createdAt: "desc" }, select: { createdAt: true },
    });
    const latestDecision = await prisma.auditLog.findFirst({
      where: { targetId: id, action: { in: ["PROVIDER_APPLICATION_REJECTED", "PROVIDER_APPLICATION_APPROVED"] } },
      orderBy: { createdAt: "desc" }, select: { createdAt: true },
    });
    if (!latestRequest || (latestDecision && latestDecision.createdAt > latestRequest.createdAt)) redirect("/admin/providers?review=not_found");
    await prisma.$transaction(async tx => {
      if (action === "APPROVE") {
        const changed = await tx.user.updateMany({ where: { id, OR: [{ role: "PROVIDER", status: "PENDING" }, { role: "CUSTOMER", status: "ACTIVE" }] }, data: { status: "ACTIVE", role: "PROVIDER", displayName: data.fullName } });
        if (changed.count !== 1) throw new Error("PROVIDER_REVIEW_CONFLICT");
        await tx.profile.upsert({
          where: { userId: id },
          update: { displayName: data.fullName, phone: data.phone, bio: data.bio, skills: [data.profession] },
          create: { userId: id, displayName: data.fullName, phone: data.phone, bio: data.bio, skills: [data.profession] },
        });
      }
      await tx.auditLog.create({
        data: { actorId: currentAdmin.id, targetId: id, action: action === "APPROVE" ? "PROVIDER_APPLICATION_APPROVED" : "PROVIDER_APPLICATION_REJECTED", details: action === "REJECT" ? reason : "تمت الموافقة بعد مراجعة بيانات التحقق." },
      });
    });
    revalidatePath("/admin/providers");
    revalidatePath("/pending");
    revalidatePath("/provider");
    redirect(action === "APPROVE" ? "/admin/providers?review=approved" : "/admin/providers?review=rejected");
  }

  return <main dir="rtl" className="min-h-screen bg-slate-50 p-5 md:p-8">
    <section className="mx-auto max-w-4xl">
      <Link href="/admin/providers" className="font-bold text-orange-600">← مراجعة مقدمي الخدمات</Link>
      <h1 className="mt-5 text-3xl font-black text-[#14213d]">ملف التحقق الخاص بمقدم الخدمة</h1>
      <p className="mt-2 text-sm leading-7 text-slate-600">هذه الصفحة متاحة للأدمن فقط. روابط صور الهوية مؤقتة وتنتهي بعد 15 دقيقة.</p>
      <article className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black">{data.fullName}</h2>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <p><b>البريد:</b> {provider.email}</p>
          <p><b>الهاتف:</b> <span dir="ltr">{data.phone}</span></p>
          <p><b>تاريخ الميلاد:</b> {data.dateOfBirth || "غير متوفر"}</p>
          <p><b>الرقم القومي:</b> <span dir="ltr">{data.nationalId}</span></p>
          <p><b>مجال الخدمة:</b> {data.profession}</p>
          <p><b>الخبرة:</b> {data.experience || "لم يذكر"}</p>
          <p className="sm:col-span-2"><b>النبذة:</b> {data.bio}</p>
          <p className="text-xs text-slate-500 sm:col-span-2">تاريخ إرسال الطلب: {submission.createdAt.toLocaleString("en-GB")}</p>
        </div>
      </article>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl bg-white p-4 shadow-sm"><h2 className="mb-3 font-black">البطاقة — الوجه الأمامي</h2>{frontUrl ? <a href={frontUrl} target="_blank" rel="noreferrer" className="font-bold text-orange-600 underline">فتح الصورة الخاصة</a> : <p className="text-sm text-red-700">الصورة غير متاحة</p>}</article>
        <article className="rounded-2xl bg-white p-4 shadow-sm"><h2 className="mb-3 font-black">البطاقة — الوجه الخلفي</h2>{backUrl ? <a href={backUrl} target="_blank" rel="noreferrer" className="font-bold text-orange-600 underline">فتح الصورة الخاصة</a> : <p className="text-sm text-red-700">الصورة غير متاحة</p>}</article>
      </div>
      {documentsComplete ? <form action={review} className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
        <label className="block text-sm font-bold">سبب الرفض (مطلوب عند الرفض)
          <textarea name="reason" maxLength={1000} rows={3} className="mt-2 w-full rounded-xl border border-slate-200 p-3"/>
        </label>
        <div className="mt-4 flex flex-wrap gap-3">
          <button name="action" value="APPROVE" className="rounded-xl bg-green-600 px-6 py-3 font-bold text-white">اعتماد مقدم الخدمة</button>
          <button name="action" value="REJECT" formNoValidate className="rounded-xl bg-red-600 px-6 py-3 font-bold text-white">رفض الطلب</button>
        </div>
      </form>
    </section>
  </main>;
}
