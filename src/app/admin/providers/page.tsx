import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptProviderApplication } from "@/lib/provider-application";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

async function reviewProvider(formData: FormData) {
  "use server";
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "SUPER_ADMIN") redirect("/login");
  const id = String(formData.get("id") || "");
  const action = String(formData.get("action") || "");
  if (!id || !["APPROVE", "REJECT"].includes(action)) return;
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, status: true } });
  if (!target) return;
  if (target.role === "CUSTOMER") {
    const application = await prisma.auditLog.findFirst({ where: { targetId: id, action: "PROVIDER_APPLICATION_SUBMITTED" }, orderBy: { createdAt: "desc" }, select: { id: true } });
    if (!application || target.status !== "ACTIVE") return;
  } else if (target.role !== "PROVIDER" || target.status !== "PENDING") {
    return;
  }
  await prisma.$transaction(async (tx) => {
    if (action === "APPROVE") {
      const changed = await tx.user.updateMany({
        where: { id, OR: [{ role: "PROVIDER", status: "PENDING" }, { role: "CUSTOMER", status: "ACTIVE" }] },
        data: { role: "PROVIDER", status: "ACTIVE" },
      });
      if (changed.count !== 1) throw new Error("PROVIDER_REVIEW_CONFLICT");
    }
    else if (target.role === "PROVIDER" && target.status === "PENDING") {
      await tx.user.updateMany({ where: { id, role: "PROVIDER", status: "PENDING" }, data: { status: "SUSPENDED" } });
    }
    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        targetId: id,
        action: action === "APPROVE" ? "PROVIDER_APPLICATION_APPROVED" : "PROVIDER_APPLICATION_REJECTED",
        details: action === "APPROVE" ? "تم الاعتماد مباشرة من لوحة الإدارة." : "تم رفض الطلب بواسطة الإدارة دون إضافة سبب.",
      },
    });
  });
  revalidatePath("/admin/providers");
  revalidatePath("/admin");
  revalidatePath("/provider");
  redirect(action === "APPROVE" ? "/admin/providers?review=approved" : "/admin/providers?review=rejected");
}

export default async function AdminProvidersPage({ searchParams }: { searchParams: Promise<{ review?: string }> }) {
  const params = await searchParams;
  const admin = await getCurrentUser();
  if (!admin) redirect("/login");
  if (admin.role !== "SUPER_ADMIN") redirect("/account");

  const [providers, submissions] = await Promise.all([
    prisma.user.findMany({
      where: { role: "PROVIDER", status: "PENDING" },
      select: { id: true, displayName: true, email: true, createdAt: true, profile: { select: { phone: true, bio: true, skills: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.auditLog.findMany({
      where: { action: "PROVIDER_APPLICATION_SUBMITTED" },
      orderBy: { createdAt: "desc" },
      take: 300,
      select: { id: true, actorId: true, targetId: true, details: true, createdAt: true },
    }),
  ]);

  const latestSubmissions = new Map<string, typeof submissions[number]>();
  for (const item of submissions) if (!latestSubmissions.has(item.targetId)) latestSubmissions.set(item.targetId, item);
  const applicantIds = [...latestSubmissions.keys()];
  const reviews = applicantIds.length ? await prisma.auditLog.findMany({
    where: { targetId: { in: applicantIds }, action: { in: ["PROVIDER_APPLICATION_REJECTED", "PROVIDER_APPLICATION_APPROVED"] } },
    orderBy: { createdAt: "desc" },
    select: { targetId: true, action: true, createdAt: true },
  }) : [];
  const latestReviews = new Map<string, typeof reviews[number]>();
  for (const review of reviews) if (!latestReviews.has(review.targetId)) latestReviews.set(review.targetId, review);
  const pendingApplications = [...latestSubmissions.values()].filter((item) => { const review = latestReviews.get(item.targetId); return !review || review.createdAt < item.createdAt; });
  const applicants = pendingApplications.map((item) => ({
    ...item,
    data: item.details ? decryptProviderApplication(item.details) : null,
  })).filter((item) => item.data !== null);
  const users = applicants.length ? await prisma.user.findMany({
    where: { id: { in: applicants.map((item) => item.targetId) } },
    select: { id: true, email: true, displayName: true },
  }) : [];
  const userById = new Map(users.map((user) => [user.id, user]));

  return <main dir="rtl" className="min-h-screen bg-slate-50 p-5 md:p-9">
    <section aria-labelledby="admin-providers-title" className="mx-auto max-w-5xl">
      <header className="mb-5"><Link href="/admin" className="font-bold text-orange-600">← لوحة الإدارة</Link></header>
      <h1 id="admin-providers-title" className="mt-5 text-3xl font-black text-[#14213d]">مراجعة مقدمي الخدمات</h1>
      {params.review === "approved" && <p role="status" className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 font-bold text-green-800">تمت الموافقة وتحديث الحساب بنجاح.</p>}
      {params.review === "rejected" && <p role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 font-bold text-amber-900">تم تسجيل رفض الطلب مع السبب.</p>}
      {params.review === "failed" && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 font-bold text-red-800">لم تتم العملية. لم يتم تغيير الحساب. راجع السجلات وحاول مرة أخرى.</p>}
      {params.review === "invalid" && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 font-bold text-red-800">البيانات غير مكتملة أو سبب الرفض قصير.</p>}
      {params.review === "not_found" && <p role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 font-bold text-amber-900">الطلب لم يعد قيد المراجعة أو تمت معالجته من قبل.</p>}
      <p className="mt-2 text-slate-600">راجع طلبات التحويل وطلبات الانضمام الجديدة. الرقم القومي يظهر للمسؤولين فقط.</p>

      <h2 className="mt-8 text-xl font-black text-[#14213d]">طلبات تحويل العملاء إلى مقدمي خدمة ({applicants.length})</h2>
      {applicants.length === 0 ? <div className="mt-4 rounded-2xl bg-white p-7 text-slate-600">لا توجد طلبات تحويل جديدة قيد المراجعة.</div> :
        <div className="mt-4 space-y-4">{applicants.map((item) => {
          const applicant = userById.get(item.targetId);
          if (!item.data || !applicant) return null;
          return <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-xl font-black text-[#14213d]">{item.data.fullName}</h3><p className="mt-1 text-sm text-slate-600">{applicant.email}</p></div><span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">قيد المراجعة</span></div>
            <div className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
              <p><b>رقم الهاتف:</b> <span dir="ltr">{item.data.phone}</span></p>
              <p><b>الرقم القومي:</b> <span dir="ltr">{item.data.nationalId}</span></p>
              <p><b>مجال الخدمة:</b> {item.data.profession}</p>
              <p><b>الخبرة:</b> {item.data.experience || "لم يذكر"}</p>
              <p className="sm:col-span-2"><b>النبذة:</b> {item.data.bio}</p>
              <p className="text-xs text-slate-500 sm:col-span-2">تاريخ التقديم: {item.createdAt.toLocaleDateString("en-GB")}</p>
            </div>
            <Link href={`/admin/providers/${item.targetId}/verification`} className="mt-4 inline-flex rounded-xl bg-orange-500 px-5 py-3 font-bold text-white">فتح ملف التحقق ومراجعة البطاقة</Link>
            <form action={reviewProvider} className="mt-4 flex flex-wrap gap-3">
              <input type="hidden" name="id" value={item.targetId} />
              <button name="action" value="APPROVE" className="rounded-xl bg-green-600 px-5 py-3 font-bold text-white">قبول مقدم الخدمة</button>
              <button name="action" value="REJECT" className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white">رفض الطلب</button>
            </form>
          </article>;
        })}</div>
      }

      <h2 className="mt-10 text-xl font-black text-[#14213d]">حسابات مقدمي الخدمة الجديدة ({providers.length})</h2>
      {providers.length === 0 ? <div className="mt-4 rounded-2xl bg-white p-7 text-slate-600">لا توجد حسابات جديدة قيد المراجعة.</div> :
        <div className="mt-4 space-y-4">{providers.map((p) => <article key={p.id} className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="text-xl font-black text-[#14213d]">{p.displayName}</h3><p className="mt-2 text-sm text-slate-600">{p.email}</p>
          {p.profile?.phone && <p className="mt-2 text-sm">الهاتف: {p.profile.phone}</p>}
          {p.profile?.bio && <p className="mt-3 leading-7 text-slate-600">{p.profile.bio}</p>}
          <p className="mt-2 text-xs text-slate-500">تاريخ التسجيل: {p.createdAt.toLocaleDateString("en-GB")}</p>
          <Link href={`/admin/providers/${p.id}/verification`} className="mt-5 inline-flex rounded-xl bg-orange-500 px-5 py-3 font-bold text-white">فتح ملف التحقق ومراجعة البطاقة</Link>
          <form action={reviewProvider} className="mt-4 flex flex-wrap gap-3">
            <input type="hidden" name="id" value={p.id} />
            <button name="action" value="APPROVE" className="rounded-xl bg-green-600 px-5 py-3 font-bold text-white">قبول مقدم الخدمة</button>
            <button name="action" value="REJECT" className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white">رفض الطلب</button>
          </form>
        </article>)}</div>
      }
    </section>
  </main>;
}
