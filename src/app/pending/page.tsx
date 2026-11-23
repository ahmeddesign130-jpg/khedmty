import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
      <div className="mb-6 rounded-2xl bg-slate-50 p-4">
        <p className="mb-3 text-center text-sm font-black text-[#14213d]">خطوات إنشاء حساب مقدم الخدمة</p>
        <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-bold sm:text-xs">
          <div className="rounded-xl bg-emerald-100 p-2 text-emerald-800">1<br/>إنشاء الحساب</div>
          <div className="rounded-xl bg-emerald-100 p-2 text-emerald-800">2<br/>كود البريد</div>
          <div className={`rounded-xl p-2 ${isPending ? "bg-emerald-100 text-emerald-800" : "bg-orange-100 text-orange-800"}`}>3<br/>بياناتك</div>
          <div className={`rounded-xl p-2 ${isPending ? "bg-orange-100 text-orange-800" : "bg-slate-200 text-slate-500"}`}>4<br/>قرار الإدارة</div>
        </div>
      </div>
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-3xl font-black text-orange-500">{isPending ? "✓" : "3"}</div>
      <h1 className="mt-6 text-center text-2xl font-black text-[#14213d]">{isPending ? "تم تأكيد بياناتك وإرسال الطلب" : "الخطوة 3: بيانات مقدم الخدمة"}</h1>
      <p className="mt-3 text-center leading-8 text-slate-600">{isPending ? "وصل طلبك بنجاح. لا تحتاج إلى تسجيل الدخول مرة أخرى أو إنشاء حساب جديد. الأدمن سيراجع بياناتك ويقرر قبولك أو رفضك، وسيظل حساب مقدم الخدمة غير مفعّل حتى صدور القرار." : "أكمل بياناتك هنا مباشرة بعد تأكيد كود البريد، دون تسجيل دخول مرة ثانية. بعد تأكيد البيانات تُرسل للأدمن للمراجعة، ولن يتم تفعيل حساب مقدم الخدمة إلا بعد موافقته."}</p>
      {rejection && <div role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm leading-7 text-red-800"><b>تم رفض الطلب السابق.</b><p>سبب الرفض: {rejection}</p></div>}
      {isPending ? <div className="mt-6 rounded-xl bg-amber-50 p-4 text-center font-bold text-amber-900">تم استلام طلبك. انتظر قرار الأدمن؛ لن تظهر بياناتك الشخصية أو صور بطاقتك للعملاء.</div> : <ProviderVerificationForm/>}
      <div className="mt-7 text-center"><Link href="/" className="font-bold text-orange-600">العودة إلى الرئيسية</Link></div>
    </section>
  </main>;
}
