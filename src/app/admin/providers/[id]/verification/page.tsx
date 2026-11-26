import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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
    select: { id: true, email: true, displayName: true, createdAt: true },
  });
  if (!provider) notFound();

  const submission = await prisma.auditLog.findFirst({
    where: { targetId: id, action: "PROVIDER_APPLICATION_SUBMITTED" },
    orderBy: { createdAt: "desc" }, select: { details: true, createdAt: true },
  });
  const latestReview = await prisma.auditLog.findFirst({
    where: { targetId: id, action: { in: ["PROVIDER_APPLICATION_REJECTED", "PROVIDER_APPLICATION_APPROVED"] } },
    orderBy: { createdAt: "desc" }, select: { createdAt: true },
  });
  if (!submission || (latestReview && latestReview.createdAt > submission.createdAt)) notFound();
  const data = submission.details ? decryptProviderApplication(submission.details) : null;
  if (!data) return <main dir="rtl" className="min-h-screen bg-slate-50 p-6"><section className="mx-auto max-w-3xl rounded-2xl bg-white p-7">تعذر قراءة بيانات الطلب بأمان. لم يتم إجراء أي تغيير على الحساب.</section></main>;

  const paths = (data.portfolioPaths || []).filter(path => path.startsWith(id + "/portfolio/"));
  const portfolioUrls = await Promise.all(paths.map(path => createStorageDownload("provider-verification", path, 900)));
  const portfolio = portfolioUrls.map((url, index) => ({ url, path: paths[index] })).filter(item => item.url);

  return <main dir="rtl" className="min-h-screen bg-slate-50 p-5 md:p-8">
    <section className="mx-auto max-w-4xl">
      <Link href="/admin/providers" className="font-bold text-orange-600">← العودة لمراجعة مقدمي الخدمات</Link>
      <h1 className="mt-5 text-3xl font-black text-[#14213d]">ملف مقدم الخدمة</h1>
      <p className="mt-2 text-sm leading-7 text-slate-600">مراجعة بيانات الحساب والخبرات ونماذج الأعمال. يظهر تاريخ الميلاد المستخرج تلقائيًا، ولا يتم الاحتفاظ بالرقم القومي الكامل.</p>
      <article className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black">{data.fullName || provider.displayName}</h2>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <p><b>البريد الإلكتروني:</b> {provider.email}</p>
          <p><b>رقم الهاتف:</b> <span dir="ltr">{data.phone}</span></p>
          <p><b>تاريخ الميلاد:</b> {data.dateOfBirth || "غير متاح"}</p>
          <p><b>مجال العمل:</b> {data.profession}</p>
          <p><b>الخبرة:</b> {data.experience || "لم يذكر"}</p>
          <p className="sm:col-span-2"><b>النبذة:</b> {data.bio}</p>
          <p className="text-xs text-slate-500 sm:col-span-2">تاريخ إرسال الطلب: {submission.createdAt.toLocaleString("en-GB")}</p>
        </div>
      </article>
      <section className="mt-5 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-[#14213d]">نماذج الأعمال ({portfolio.length})</h2>
        {portfolio.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {portfolio.map((item,index)=><a key={item.path} href={item.url!} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 p-4 font-bold text-orange-700 underline">فتح نموذج العمل {index+1}</a>)}
        </div> : <p className="mt-3 text-sm leading-7 text-slate-600">هذا طلب قديم أُرسل قبل إضافة نماذج الأعمال. يمكنك مراجعة بياناته من هنا.</p>}
      </section>
      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-900">قرار القبول أو الرفض يتم من صفحة مراجعة مقدمي الخدمات. اكتب سبب الرفض عند اختيار الرفض حتى يعرف المتقدم ما الذي يحتاج إلى تعديله.</div>
      <Link href="/admin/providers" className="mt-5 inline-flex rounded-xl bg-orange-500 px-6 py-3 font-black text-white">العودة إلى قائمة الطلبات</Link>
    </section>
  </main>;
}
