import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import ProviderVerificationForm from "../../pending/ProviderVerificationForm";

export default async function ProviderApplyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "SUPER_ADMIN") redirect("/admin");
  if (user.role === "PROVIDER") redirect(user.status === "ACTIVE" ? "/provider" : "/pending");
  if (user.status !== "ACTIVE") redirect("/login");
  return <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-10">
    <section className="mx-auto max-w-2xl rounded-3xl bg-white p-6 shadow-lg sm:p-9">
      <Link href="/account" className="font-bold text-orange-600">← العودة لحساب العميل</Link>
      <h1 className="mt-6 text-2xl font-black text-[#14213d]">طلب الانضمام كمقدم خدمة</h1>
      <p className="mt-3 leading-8 text-slate-600">املأ بيانات التحقق وارفع صور البطاقة. ستظل بياناتك خاصة ولن تظهر للعملاء، ولن يتحول حسابك إلى مقدم خدمة إلا بعد مراجعة الإدارة.</p>
      <ProviderVerificationForm/>
    </section>
  </main>;
}
