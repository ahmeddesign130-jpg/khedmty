import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptProviderApplication } from "@/lib/provider-application";
import ProviderVerificationForm from "./ProviderVerificationForm";

export const dynamic = "force-dynamic";

export default async function PendingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "SUPER_ADMIN") redirect("/admin");
  if (user.role !== "PROVIDER") redirect("/account");
  if (user.status === "ACTIVE") redirect("/provider");
  const latest = await prisma.auditLog.findFirst({
    where: { targetId: user.id, action: { in: ["PROVIDER_APPLICATION_SUBMITTED", "PROVIDER_APPLICATION_REJECTED", "PROVIDER_APPLICATION_APPROVED"] } },
    orderBy: { createdAt: "desc" }, select: { action: true, details: true, createdAt: true },
  });
  const isPending = latest?.action === "PROVIDER_APPLICATION_SUBMITTED";
  const rejection = latest?.action === "PROVIDER_APPLICATION_REJECTED" ? latest.details : null;

  return <main dir="rtl" className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-4 py-10">
    <section className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-lg sm:p-9">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-3xl font-black text-orange-500">!</div>
      <h1 className="mt-6 text-center text-2xl font-black text-[#14213d]">{isPending ? "طلبك قيد المراجعة" : "استكمل بيانات مقدم الخدمة"}</h1>
      <p className="mt-3 text-center leading-8 text-slate-600">{isPending ? "استلمنا بياناتك. فريق خِدمتي يراجعها، وسيتم تفعيل حسابك بعد الموافقة." : "قبل تفعيل حساب مقدم الخدمة، نحتاج بيانات التحقق وصور البطاقة. هذه المعلومات خاصة ولا تظهر للعملاء."}</p>
      {rejection && <div role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm leading-7 text-red-800"><b>تم رفض الطلب السابق.</b><p>سبب الرفض: {rejection}</p></div>}
      {isPending ? <div className="mt-6 rounded-xl bg-amber-50 p-4 text-center font-bold text-amber-900">لا تحتاج إلى إنشاء حساب جديد. يمكنك العودة لهذه الصفحة لمتابعة حالة الطلب.</div> : <ProviderVerificationForm/>}
      <div className="mt-7 text-center"><Link href="/" className="font-bold text-orange-600">العودة إلى الرئيسية</Link></div>
    </section>
  </main>;
}
