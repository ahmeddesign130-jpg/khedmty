import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptProviderApplication } from "@/lib/provider-application";

export const dynamic = "force-dynamic";

async function reviewProvider(formData: FormData) {
  "use server";
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "SUPER_ADMIN") redirect("/login");
  const id = String(formData.get("id") || "");
  const action = String(formData.get("action") || "");
  const reason = String(formData.get("reason") || "").trim();
  if (!id || !["APPROVE", "REJECT"].includes(action) || (action === "REJECT" && reason.length < 5) || reason.length > 1000) {
    redirect("/admin/providers?review=invalid");
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, status: true } });
  if (!target || !((target.role === "PROVIDER" && target.status === "PENDING") || (target.role === "CUSTOMER" && target.status === "ACTIVE"))) {
    redirect("/admin/providers?review=not_found");
  }

  const latestRequest = await prisma.auditLog.findFirst({
    where: { targetId: id, action: "PROVIDER_APPLICATION_SUBMITTED" },
    orderBy: { createdAt: "desc" }, select: { details: true, createdAt: true },
  });
  const latestDecision = await prisma.auditLog.findFirst({
    where: { targetId: id, action: { in: ["PROVIDER_APPLICATION_REJECTED", "PROVIDER_APPLICATION_APPROVED"] } },
    orderBy: { createdAt: "desc" }, select: { createdAt: true },
  });
  if (!latestRequest || (latestDecision && latestDecision.createdAt > latestRequest.createdAt)) {
    redirect("/admin/providers?review=not_found");
  }
  const application = latestRequest.details ? decryptProviderApplication(latestRequest.details) : null;
  if (!application || !application.fullName || !application.profession || !application.bio) {
    redirect("/admin/providers?review=incomplete");
  }

  await prisma.$transaction(async tx => {
    if (action === "APPROVE") {
      const changed = await tx.user.updateMany({
        where: { id, OR: [{ role: "PROVIDER", status: "PENDING" }, { role: "CUSTOMER", status: "ACTIVE" }] },
        data: { role: "PROVIDER", status: "ACTIVE" },
      });
      if (changed.count !== 1) throw new Error("PROVIDER_REVIEW_CONFLICT");
    }
    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        targetId: id,
        action: action === "APPROVE" ? "PROVIDER_APPLICATION_APPROVED" : "PROVIDER_APPLICATION_REJECTED",
        details: action === "APPROVE" ? "تمت الموافقة بعد مراجعة بيانات مقدم الخدمة ونماذج أعماله." : reason,
      },
    });
  });
  revalidatePath("/admin/providers");
  revalidatePath("/admin");
  revalidatePath("/pending");
  revalidatePath("/provider");
  redirect(action === "APPROVE" ? "/admin/providers?review=approved" : "/admin/providers?review=rejected");
}


async function approveProvider(formData: FormData) {
  "use server";
  formData.set("action", "APPROVE");
  await reviewProvider(formData);
}

async function rejectProvider(formData: FormData) {
  "use server";
  formData.set("action", "REJECT");
  await reviewProvider(formData);
}

export default async function AdminProvidersPage({ searchParams }: { searchParams: Promise<{ review?: string }> }) {
  const params = await searchParams;
  const admin = await getCurrentUser();
  if (!admin) redirect("/login");
  if (admin.role !== "SUPER_ADMIN") redirect("/account");

  const [submissions, incompleteProviders] = await Promise.all([
    prisma.auditLog.findMany({
      where: { action: "PROVIDER_APPLICATION_SUBMITTED" },
      orderBy: { createdAt: "desc" }, take: 500,
      select: { id: true, targetId: true, details: true, createdAt: true },
    }),
    prisma.user.findMany({
      where: { role: "PROVIDER", status: "PENDING" },
      select: { id: true, displayName: true, email: true, createdAt: true },
      orderBy: { createdAt: "asc" }, take: 100,
    }),
  ]);

  const latestSubmissions = new Map<string, typeof submissions[number]>();
  for (const item of submissions) if (!latestSubmissions.has(item.targetId)) latestSubmissions.set(item.targetId, item);
  const ids = [...latestSubmissions.keys()];
  const decisions = ids.length ? await prisma.auditLog.findMany({
    where: { targetId: { in: ids }, action: { in: ["PROVIDER_APPLICATION_REJECTED", "PROVIDER_APPLICATION_APPROVED"] } },
    orderBy: { createdAt: "desc" }, select: { targetId: true, action: true, createdAt: true },
  }) : [];
  const latestDecisions = new Map<string, typeof decisions[number]>();
  for (const item of decisions) if (!latestDecisions.has(item.targetId)) latestDecisions.set(item.targetId, item);

  const pending = [...latestSubmissions.values()].filter(item => {
    const decision = latestDecisions.get(item.targetId);
    return !decision || decision.createdAt < item.createdAt;
  });
  const applicantIds = pending.map(item => item.targetId);
  const users = applicantIds.length ? await prisma.user.findMany({
    where: { id: { in: applicantIds }, OR: [{ role: "PROVIDER", status: "PENDING" }, { role: "CUSTOMER", status: "ACTIVE" }] },
    select: { id: true, email: true, displayName: true, createdAt: true },
  }) : [];
  const userMap = new Map(users.map(user => [user.id, user]));
  const applicants = pending.map(item => ({
    ...item, user: userMap.get(item.targetId),
    data: item.details ? decryptProviderApplication(item.details) : null,
  })).filter(item => item.user && item.data);
  const submittedIds = new Set(submissions.map(item => item.targetId));
  const incomplete = incompleteProviders.filter(provider => !submittedIds.has(provider.id));

  return <main dir="rtl" className="min-h-screen bg-slate-50 p-5 md:p-9">
    <section className="mx-auto max-w-5xl">
      <header className="mb-5"><Link href="/admin" className="font-bold text-orange-600">← لوحة الإدارة</Link></header>
      <h1 className="mt-5 text-3xl font-black text-[#14213d]">مراجعة مقدمي الخدمات</h1>
      <p className="mt-2 leading-7 text-slate-600">كل طلب يحتاج مراجعة البيانات ونماذج الأعمال. لا يتم تفعيل أي مقدم خدمة قبل موافقة الإدارة، ويظهر تاريخ الميلاد المستخرج من الرقم القومي، ولا يتم الاحتفاظ بالرقم القومي الكامل.</p>
      {params.review === "approved" && <p role="status" className="mt-4 rounded-xl bg-green-50 p-4 font-bold text-green-800">تمت الموافقة وتفعيل حساب مقدم الخدمة بنجاح.</p>}
      {params.review === "rejected" && <p role="status" className="mt-4 rounded-xl bg-amber-50 p-4 font-bold text-amber-900">تم رفض الطلب وحفظ سبب الرفض. الحساب لم يتم تفعيله.</p>}
      {params.review === "invalid" && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 font-bold text-red-800">اكتب سبب رفض لا يقل عن 5 أحرف، أو راجع الإجراء.</p>}
      {params.review === "not_found" && <p role="alert" className="mt-4 rounded-xl bg-amber-50 p-4 font-bold text-amber-900">الطلب غير موجود أو تمت مراجعته بالفعل.</p>}
      {params.review === "incomplete" && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 font-bold text-red-800">بيانات الطلب أو نماذج الأعمال غير مكتملة؛ لم يتم تغيير الحساب.</p>}

      <h2 className="mt-8 text-xl font-black text-[#14213d]">طلبات جاهزة للمراجعة ({applicants.length})</h2>
      {applicants.length === 0 ? <div className="mt-4 rounded-2xl bg-white p-7 text-slate-600">لا توجد طلبات مكتملة قيد المراجعة حاليًا.</div> :
        <div className="mt-4 space-y-4">{applicants.map(item => {
          const data = item.data!;
          const user = item.user!;
          return <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h3 className="text-xl font-black text-[#14213d]">{data.fullName}</h3><p className="mt-1 text-sm text-slate-600">{user.email}</p></div>
              <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">قيد المراجعة</span>
            </div>
            <div className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
              <p><b>رقم الهاتف:</b> <span dir="ltr">{data.phone}</span></p>
              <p><b>تاريخ الميلاد:</b> {data.dateOfBirth || "غير متاح"}</p>
              <p><b>مجال العمل:</b> {data.profession}</p>
              <p><b>الخبرة:</b> {data.experience || "لم يذكر"}</p>
              <p><b>نماذج الأعمال:</b> {data.portfolioPaths?.length || 0} ملفات</p>
              <p className="sm:col-span-2"><b>النبذة:</b> {data.bio}</p>
              <p className="text-xs text-slate-500 sm:col-span-2">تاريخ التقديم: {item.createdAt.toLocaleDateString("en-GB")}</p>
            </div>
            <Link href={`/admin/providers/${item.targetId}/verification`} className="mt-4 inline-flex rounded-xl border border-orange-200 px-5 py-3 font-bold text-orange-700">فتح الملف ومشاهدة نماذج الأعمال</Link>
            <form action={reviewProvider} className="mt-4 space-y-3">
              <input type="hidden" name="id" value={item.targetId}/>
              <label className="block text-sm font-bold text-slate-700">سبب الرفض (مطلوب عند الرفض)
                <textarea name="reason" minLength={5} maxLength={1000} rows={2} placeholder="اكتب سبب الرفض بوضوح ليظهر لصاحب الطلب..." className="mt-2 w-full rounded-xl border border-slate-200 p-3"/>
              </label>
              <div className="flex flex-wrap gap-3">
                <button type="submit" formAction={approveProvider} className="rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white">قبول وتفعيل الحساب</button>
                <button type="submit" formAction={rejectProvider} className="rounded-xl bg-red-600 px-6 py-3 font-bold text-white">رفض الطلب</button>
              </div>
            </form>
          </article>;
        })}</div>
      }

      <h2 className="mt-10 text-xl font-black text-[#14213d]">حسابات لم تستكمل طلب الانضمام ({incomplete.length})</h2>
      {incomplete.length === 0 ? <div className="mt-4 rounded-2xl bg-white p-6 text-slate-600">لا توجد حسابات تنتظر استكمال البيانات.</div> :
        <div className="mt-4 space-y-3">{incomplete.map(user => <article key={user.id} className="rounded-xl bg-white p-5">
          <p className="font-black">{user.displayName}</p><p className="mt-1 text-sm text-slate-600">{user.email}</p>
          <p className="mt-2 text-sm text-amber-800">لم يرسل بيانات المراجعة ونماذج الأعمال بعد؛ لا يمكن قبول الحساب قبل اكتمال الطلب.</p>
        </article>)}</div>}
    </section>
  </main>;
}
