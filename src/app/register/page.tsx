import Link from "next/link";
import { RegisterForm } from "@/components/register-form";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <main dir="rtl" className="auth-v7-page flex min-h-screen items-center justify-center px-5 py-10">
      <section className="auth-v7-card auth-readable glass-surface w-full max-w-md rounded-[26px] p-6 md:p-8">
        <h1 className="mt-2 text-center text-2xl font-semibold">إنشاء حساب جديد</h1>
        <p className="mt-2 text-center text-sm leading-7">حساب واحد يوصلك للخدمة اللي تحتاجها أو يفتح مهارتك لعملاء جدد.</p>
        <RegisterForm error={params.error}/>
        <p className="mt-5 text-center text-sm text-slate-600">لديك حساب بالفعل؟ <Link href="/login" className="font-semibold text-orange-600">تسجيل الدخول</Link></p>
        <Link href="/" className="mt-3 block text-center text-sm font-medium text-slate-600">العودة للرئيسية</Link>
      </section>
    </main>
  );
}
