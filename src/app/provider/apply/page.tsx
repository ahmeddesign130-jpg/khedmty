import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ProviderVerificationForm from "../../pending/ProviderVerificationForm";

export const dynamic = "force-dynamic";

export default async function ProviderApplyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "SUPER_ADMIN") redirect("/admin");
  if (user.role === "PROVIDER") redirect(user.status === "ACTIVE" ? "/provider" : "/pending");
  if (user.status !== "ACTIVE") redirect("/login");
  const latest = await prisma.auditLog.findFirst({
    where: { targetId: user.id, action: { in: ["PROVIDER_APPLICATION_SUBMITTED", "PROVIDER_APPLICATION_REJECTED", "PROVIDER_APPLICATION_APPROVED"] } },
    orderBy: { createdAt: "desc" }, select: { action: true, details: true },
  });
  const pending = latest?.action === "PROVIDER_APPLICATION_SUBMITTED";
  const rejected = latest?.action === "PROVIDER_APPLICATION_REJECTED" ? latest.details : null;
  return <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-10">
    <section className="mx-auto max-w-2xl rounded-3xl bg-white p-6 shadow-lg sm:p-9">
      <Link href="/account" className="font-bold text-orange-600">← العودة لحساب العميل</Link>
      <h1 className="mt-6 text-2xl font-black text-[#14213d]">طلب الانضمام كمقدم خدمة</h1>
      <p className="mt-3 leading-8 text-slate-600">بيانات التحقق وصور البطاقة خاصة ولا تظهر للعملاء. لن يتحول حسابك إلى مقدم خدمة إلا بعد مراجعة الإدارة.</p>
      {pending ? <div role="status" className="mt-6 rounded-xl bg-amber-50 p-5 font-bold leading-8 text-amber-900">تم استلام طلبك وهو قيد المراجعة. لا تحتاج إلى إرسال طلب آخر.</div> : <>
        {rejected && <div role="alert" className="mt-5 rounded-xl bg-red-50 p-4 leading-7 text-red-800"><b>تم رفض الطلب السابق.</b><p>سبب الرفض: {rejected}</p><p className="mt-2 text-sm">يمكنك تحديث بياناتك وإرسال الطلب مرة أخرى.</p></div>}
        <ProviderVerificationForm/>
      </>}
    </section>
  </main>;
}
