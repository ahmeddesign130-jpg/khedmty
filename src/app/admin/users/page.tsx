import Link from "next/link";
import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function deleteAccount(formData: FormData) {
  "use server";
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "SUPER_ADMIN") redirect("/login");
  const id = String(formData.get("id") || "");
  if (!id) return;
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, email: true } });
  if (!target || target.role === "SUPER_ADMIN" || target.email.endsWith("@deleted.khedmty.invalid")) return;
  const deletedEmail = `deleted-${target.id}@deleted.khedmty.invalid`;
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: { email: deletedEmail, displayName: "حساب محذوف", passwordHash: randomBytes(48).toString("hex"), status: "SUSPENDED" },
    });
    await tx.profile.updateMany({
      where: { userId: id },
      data: { displayName: null, bio: null, avatarUrl: null, phone: null, skills: [] },
    });
    await tx.emailOtp.deleteMany({ where: { userId: id } });
    await tx.service.updateMany({ where: { providerId: id }, data: { status: "PAUSED" } });
    await tx.auditLog.deleteMany({ where: { targetId: id } });
  });
  revalidatePath("/admin/users");
  revalidatePath("/admin/providers");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/payments");
  revalidatePath("/services");
}

async function changeAccess(formData: FormData) {
  "use server";
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "SUPER_ADMIN") redirect("/login");
  const id = String(formData.get("id") || "");
  const action = String(formData.get("action") || "");
  if (!id || !["SUSPEND", "ACTIVATE"].includes(action)) return;
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, status: true } });
  if (!target || target.role === "SUPER_ADMIN" || target.status === "PENDING") return;
  const nextStatus = action === "SUSPEND" ? "SUSPENDED" : "ACTIVE";
  const changed = await prisma.user.updateMany({
    where: { id, role: target.role, status: target.status },
    data: { status: nextStatus },
  });
  if (changed.count !== 1) return;
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: action === "SUSPEND" ? "USER_SUSPENDED" : "USER_REACTIVATED",
      targetId: id,
      details: action === "SUSPEND" ? "تم حظر الحساب من لوحة الإدارة." : "تم إعادة تفعيل الحساب من لوحة الإدارة.",
    },
  });
  revalidatePath("/admin/users");
  revalidatePath("/admin");
}

export default async function AdminUsersPage() {
  const admin = await getCurrentUser();
  if (!admin) redirect("/login");
  if (admin.role !== "SUPER_ADMIN") redirect("/account");
  const users = await prisma.user.findMany({
    where: { role: { in: ["CUSTOMER", "PROVIDER"] }, NOT: { email: { endsWith: "@deleted.khedmty.invalid" } } },
    select: { id: true, displayName: true, email: true, role: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return <main dir="rtl" className="min-h-screen bg-slate-50 p-4 md:p-8">
    <div className="mx-auto max-w-5xl">
      <Link href="/admin" className="font-bold text-orange-600">← العودة للوحة الإدارة</Link>
      <h1 className="mt-6 text-3xl font-black text-slate-900">إدارة العملاء ومقدمي الخدمات</h1>
      <p className="mt-2 text-slate-600">يمكنك حظر الحساب أو إعادة تفعيله أو حذف بيانات الحساب الشخصية. تظل الطلبات والمدفوعات محفوظة في السجل المالي.</p>
      <div className="mt-6 space-y-3">
        {users.map((u) => <article key={u.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-black text-slate-900">{u.displayName}</h2>
              <p dir="ltr" className="mt-1 text-left text-sm text-slate-600">{u.email}</p>
              <p className="mt-2 text-xs text-slate-500">{u.role === "PROVIDER" ? "مقدم خدمة" : "عميل"} · {u.status === "ACTIVE" ? "نشط" : u.status === "SUSPENDED" ? "محظور" : "قيد المراجعة"} · {u.createdAt.toLocaleDateString("en-GB")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
            {u.status !== "PENDING" && <form action={changeAccess}>
              <input type="hidden" name="id" value={u.id}/>
              {u.status === "ACTIVE"
                ? <button name="action" value="SUSPEND" className="rounded-xl bg-red-600 px-4 py-2.5 font-bold text-white">حظر الحساب</button>
                : <button name="action" value="ACTIVATE" className="rounded-xl bg-green-600 px-4 py-2.5 font-bold text-white">إلغاء الحظر</button>}
            </form>}
            <form action={deleteAccount}>
              <input type="hidden" name="id" value={u.id}/>
              <button className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 font-bold text-red-700" type="submit">حذف الحساب</button>
            </form>
            </div>
          </div>
        </article>)}
        {users.length === 0 && <div className="rounded-2xl bg-white p-8 text-center text-slate-600">لا توجد حسابات حتى الآن.</div>}
      </div>
    </div>
  </main>;
}
