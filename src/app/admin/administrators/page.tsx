import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// The original platform owner is protected even if another administrator uses this page.
const PRIMARY_ADMIN_EMAIL = (process.env.PRIMARY_ADMIN_EMAIL || "ahmeddesign130@gmail.com").trim().toLowerCase();

async function addAdministrator(formData: FormData) {
  "use server";
  const actor = await getCurrentUser();
  if (!actor || actor.role !== "SUPER_ADMIN") redirect("/login");

  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email || email.length > 254) redirect("/admin/administrators?error=email");

  const target = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, role: true, status: true } });
  if (!target) redirect("/admin/administrators?error=not_found");
  if (target.status !== "ACTIVE" || target.role === "SUPER_ADMIN") redirect("/admin/administrators?error=not_eligible");

  const changed = await prisma.user.updateMany({
    where: { id: target.id, role: { in: ["CUSTOMER", "PROVIDER"] }, status: "ACTIVE" },
    data: { role: "SUPER_ADMIN" },
  });
  if (changed.count !== 1) redirect("/admin/administrators?error=conflict");

  await prisma.auditLog.create({
    data: { actorId: actor.id, action: "ADMINISTRATOR_ADDED", targetId: target.id, details: "تمت ترقية الحساب إلى مسؤول." },
  });
  revalidatePath("/admin/administrators");
  revalidatePath("/admin");
  redirect("/admin/administrators?success=added");
}

async function removeAdministrator(formData: FormData) {
  "use server";
  const actor = await getCurrentUser();
  if (!actor || actor.role !== "SUPER_ADMIN") redirect("/login");

  const id = String(formData.get("id") || "");
  if (!id || id === actor.id) redirect("/admin/administrators?error=self");
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, role: true } });
  if (!target || target.role !== "SUPER_ADMIN") redirect("/admin/administrators?error=not_admin");
  if (target.email.toLowerCase() === PRIMARY_ADMIN_EMAIL) redirect("/admin/administrators?error=protected");

  const changed = await prisma.user.updateMany({
    where: { id, role: "SUPER_ADMIN", email: { not: PRIMARY_ADMIN_EMAIL } },
    data: { role: "CUSTOMER" },
  });
  if (changed.count !== 1) redirect("/admin/administrators?error=protected");

  await prisma.auditLog.create({
    data: { actorId: actor.id, action: "ADMINISTRATOR_REMOVED", targetId: target.id, details: "تم إلغاء صلاحيات المسؤول وإعادته إلى حساب عميل." },
  });
  revalidatePath("/admin/administrators");
  revalidatePath("/admin");
  redirect("/admin/administrators?success=removed");
}

const messages: Record<string, string> = {
  email: "اكتب بريدًا إلكترونيًا صحيحًا.",
  not_found: "لا يوجد حساب بهذا البريد. يجب أن ينشئ الشخص حسابًا أولًا.",
  not_eligible: "لا يمكن ترقية هذا الحساب؛ تأكد أنه نشط وليس مسؤولًا بالفعل.",
  conflict: "تغيرت بيانات الحساب أثناء العملية. حدّث الصفحة وحاول مرة أخرى.",
  self: "لا يمكنك إزالة صلاحيات حسابك الحالي.",
  not_admin: "هذا الحساب ليس مسؤولًا حاليًا.",
  protected: "هذا هو حساب مالك خِدمتي الأساسي، ولا يمكن لأي مسؤول آخر إزالة صلاحياته.",
};

export default async function AdministratorsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login");
  if (actor.role !== "SUPER_ADMIN") redirect("/account");
  const params = await searchParams;
  const admins = await prisma.user.findMany({
    where: { role: "SUPER_ADMIN" },
    select: { id: true, email: true, displayName: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/admin" className="font-bold text-orange-600">← العودة للوحة الإدارة</Link>
        <header className="mt-6">
          <p className="text-sm font-bold text-orange-600">صلاحيات لوحة التحكم</p>
          <h1 className="mt-2 text-3xl font-black text-slate-900">إدارة المسؤولين</h1>
          <p className="mt-3 leading-8 text-slate-600">أضف حسابًا موجودًا ليحصل على صلاحيات إدارة خِدمتي. المسؤول الجديد يستطيع إدارة المنصة، لكنه لا يستطيع إزالة صلاحيات حساب المالك الأساسي.</p>
        </header>

        {params.error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">{messages[params.error] || "تعذر تنفيذ العملية."}</p>}
        {params.success && <p role="status" className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 font-bold text-green-700">{params.success === "added" ? "تمت إضافة المسؤول بنجاح." : "تمت إزالة صلاحيات المسؤول."}</p>}

        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-black text-slate-900">إضافة مسؤول جديد</h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">اكتب بريد الشخص بعد ما ينشئ حسابًا عاديًا ويسجل الدخول مرة واحدة. لن يتم إنشاء حساب بكلمة مرور من هنا.</p>
          <form action={addAdministrator} className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input name="email" type="email" required maxLength={254} placeholder="name@example.com" dir="ltr" className="min-h-12 flex-1 rounded-xl border border-slate-300 px-4 text-left text-base text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"/>
            <button type="submit" className="min-h-12 rounded-xl bg-orange-600 px-6 font-black text-white transition hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400">إضافة كمسؤول</button>
          </form>
        </section>

        <section className="mt-7">
          <h2 className="text-xl font-black text-slate-900">المسؤولون الحاليون ({admins.length})</h2>
          <div className="mt-4 space-y-3">
            {admins.map((admin) => {
              const isOwner = admin.email.toLowerCase() === PRIMARY_ADMIN_EMAIL;
              const isSelf = admin.id === actor.id;
              return (
                <article key={admin.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:p-5">
                  <div className="min-w-0">
                    <h3 className="font-black text-slate-900">{admin.displayName}</h3>
                    <p dir="ltr" className="mt-1 break-all text-left text-sm text-slate-600">{admin.email}</p>
                    <p className="mt-2 text-xs font-bold text-slate-500">{isOwner ? "مالك المنصة — محمي" : isSelf ? "حسابك الحالي" : "مسؤول"}</p>
                  </div>
                  {isOwner ? <span className="w-fit rounded-full bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">المالك الأساسي</span>
                    : isSelf ? <span className="w-fit rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">لا يمكن إزالة حسابك من هنا</span>
                    : <form action={removeAdministrator}>
                        <input type="hidden" name="id" value={admin.id}/>
                        <button type="submit" className="min-h-11 rounded-xl border border-red-200 px-4 font-bold text-red-700 transition hover:bg-red-50" formAction={removeAdministrator}>إزالة صلاحيات المسؤول</button>
                      </form>}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
