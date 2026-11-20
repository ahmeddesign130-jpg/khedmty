import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptProviderApplication } from "@/lib/provider-application";

export const dynamic = "force-dynamic";

async function reviewExistingProvider(formData: FormData) {
  "use server";
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "SUPER_ADMIN") redirect("/login");
  const id = String(formData.get("id") || "");
  const action = String(formData.get("action") || "");
  const reason = String(formData.get("reason") || "").trim();
  if (!id || !["APPROVE", "REJECT"].includes(action) || (action === "REJECT" && !reason)) return;
  const provider = await prisma.user.findFirst({ where: { id, role: "PROVIDER", status: "PENDING" } });
  if (!provider) return;
  await prisma.$transaction(async (tx) => {
    const updated = await tx.user.updateMany({ where: { id, role: "PROVIDER", status: "PENDING" }, data: { status: action === "APPROVE" ? "ACTIVE" : "SUSPENDED" } });
    if (updated.count !== 1) throw new Error("PROVIDER_REVIEW_CONFLICT");
    await tx.auditLog.create({ data: { actorId: admin.id, action: action === "APPROVE" ? "PROVIDER_APPROVED" : "PROVIDER_REJECTED", targetId: id, details: action === "REJECT" ? reason : "تمت الموافقة" } });
  });
  revalidatePath("/admin/providers");
  revalidatePath("/admin");
}

async function reviewCustomerApplication(formData: FormData) {
  "use server";
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "SUPER_ADMIN") redirect("/login");
  const id = String(formData.get("id") || "");
  const action = String(formData.get("action") || "");
  const reason = String(formData.get("reason") || "").trim();
  if (!id || !["APPROVE", "REJECT"].includes(action) || (action === "REJECT" && (reason.length < 3 || reason.length > 1000))) return;
  const latest = await prisma.auditLog.findFirst({
    where: { targetId: id, action: { in: ["PROVIDER_APPLICATION_SUBMITTED", "PROVIDER_APPLICATION_REJECTED", "PROVIDER_APPLICATION_APPROVED"] } },
    orderBy: { createdAt: "desc" }, select: { action: true },
  });
  if (latest?.action !== "PROVIDER_APPLICATION_SUBMITTED") return;
  await prisma.$transaction(async (tx) => {
    if (action === "APPROVE") {
      const changed = await tx.user.updateMany({ where: { id, role: "CUSTOMER", status: "ACTIVE" }, data: { role: "PROVIDER" } });
      if (changed.count !== 1) throw new Error("APPLICATION_REVIEW_CONFLICT");
      const application = await tx.auditLog.findFirst({
        where: { targetId: id, action: "PROVIDER_APPLICATION_SUBMITTED" },
        orderBy: { createdAt: "desc" },
        select: { details: true },
      });
      const details = application?.details ? decryptProviderApplication(application.details) : null;
      if (!details) throw new Error("APPLICATION_DATA_UNAVAILABLE");
      await tx.profile.upsert({
        where: { userId: id },
        update: { displayName: details.fullName, phone: details.phone, bio: details.bio, skills: [details.profession] },
        create: { userId: id, displayName: details.fullName, phone: details.phone, bio: details.bio, skills: [details.profession] },
      });
    }
    await tx.auditLog.create({
      data: { actorId: admin.id, targetId: id, action: action === "APPROVE" ? "PROVIDER_APPLICATION_APPROVED" : "PROVIDER_APPLICATION_REJECTED", details: action === "REJECT" ? reason : "تمت الموافقة على طلب التحويل إلى مقدم خدمة." },
    });
  });
  revalidatePath("/admin/providers");
  revalidatePath("/account");
  revalidatePath("/admin");
}

export default async function AdminProvidersPage() {
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
            <form action={reviewCustomerApplication} className="mt-4 space-y-3">
              <input type="hidden" name="id" value={item.targetId}/>
              <label className="block text-sm font-bold text-slate-700">سبب الرفض (مطلوب عند الرفض)<textarea name="reason" maxLength={1000} rows={2} className="mt-2 w-full rounded-xl border border-slate-200 p-3"/></label>
              <div className="flex flex-wrap gap-3"><button name="action" value="APPROVE" className="rounded-xl bg-green-600 px-5 py-3 font-bold text-white">الموافقة وتحويله لمقدم خدمة</button><button name="action" value="REJECT" formNoValidate className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white">رفض الطلب</button></div>
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
          <form action={reviewExistingProvider} className="mt-5 space-y-3"><input type="hidden" name="id" value={p.id}/>
            <label className="block text-sm font-bold text-slate-700">سبب الرفض (مطلوب عند الرفض)<textarea name="reason" maxLength={1000} rows={2} className="mt-2 w-full rounded-xl border border-slate-200 p-3"/></label>
            <div className="flex flex-wrap gap-3"><button name="action" value="APPROVE" className="rounded-xl bg-green-600 px-5 py-3 font-bold text-white">الموافقة على الحساب</button><button name="action" value="REJECT" formNoValidate className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white">رفض الحساب</button></div>
          </form>
        </article>)}</div>
      }
    </section>
  </main>;
}
