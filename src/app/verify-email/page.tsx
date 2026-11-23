import Link from "next/link";
import { prisma } from "@/lib/prisma";

const errors: Record<string, string> = {
  required: "لازم تأكد بريدك الإلكتروني بالكود قبل تسجيل الدخول.",
  invalid: "اكتب البريد الإلكتروني وكودًا مكوّنًا من 6 أرقام.",
  expired: "الكود انتهت صلاحيته. اطلب كودًا جديدًا.",
  locked: "تم إيقاف المحاولات مؤقتًا بعد 5 محاولات خاطئة. اطلب كودًا جديدًا.",
  wrong: "الكود غير صحيح. راجع الرسالة وحاول مرة أخرى.",
  wait: "انتظر دقيقة قبل طلب كود جديد.",
  send: "تعذر إرسال كود جديد. حاول مرة أخرى.",
  server: "حصل خطأ أثناء تأكيد البريد. حاول مرة أخرى.",
};

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ email?: string; error?: string; sent?: string }> }) {
  const params = await searchParams;
  const email = (params.email || "").trim().toLowerCase();
  const account = email ? await prisma.user.findUnique({ where: { email }, select: { role: true } }).catch(() => null) : null;
  const isProvider = account?.role === "PROVIDER";
  return (
    <main dir="rtl" className="auth-v7-page flex min-h-screen items-center justify-center px-5 py-10">
      <section className="auth-v7-card auth-readable glass-surface w-full max-w-md rounded-[30px] p-7 md:p-10">
        {isProvider && <div className="mb-5 grid grid-cols-4 gap-2 text-center text-[11px] font-bold sm:text-xs">
          <div className="rounded-xl bg-emerald-100 p-2 text-emerald-800">1<br/>إنشاء الحساب</div>
          <div className="rounded-xl bg-orange-100 p-2 text-orange-800">2<br/>كود البريد</div>
          <div className="rounded-xl bg-slate-200 p-2 text-slate-500">3<br/>بياناتك</div>
          <div className="rounded-xl bg-slate-200 p-2 text-slate-500">4<br/>قرار الإدارة</div>
        </div>}
        <h1 className="mt-3 text-center text-3xl font-black text-white">تأكيد البريد الإلكتروني</h1>
        <p className="mt-4 text-center text-base leading-8 text-slate-300">{isProvider ? "دي الخطوة الثانية في إنشاء حساب مقدم الخدمة. بعد تأكيد الكود هتنتقل تلقائيًا لإكمال بياناتك، من غير ما تحتاج تسجل دخول مرة ثانية." : "بعتنالك كود من 6 أرقام على بريدك الإلكتروني. الكود صالح لمدة دقيقتين."}</p>
        {params.error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">{errors[params.error] || errors.server}</p>}
        {params.sent === "1" && <p role="status" className="mt-5 rounded-xl bg-green-50 p-4 text-sm font-bold text-green-700">تم إرسال كود جديد إلى بريدك.</p>}
        <form action="/api/auth/verify-email" method="POST" className="mt-7 space-y-5">
          <div><label htmlFor="email" className="mb-2 block text-base font-bold text-slate-700">البريد الإلكتروني</label><input id="email" name="email" type="email" required defaultValue={email} dir="ltr" className="w-full px-4 py-4 text-base text-left"/></div>
          <div><label htmlFor="code" className="mb-2 block text-base font-bold text-slate-700">كود التأكيد</label><input id="code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required placeholder="000000" dir="ltr" className="w-full px-4 py-4 text-center text-2xl font-black tracking-[0.4em]"/></div>
          <button type="submit" className="w-full rounded-xl bg-orange-500 px-5 py-4 text-lg font-black text-white shadow-lg hover:bg-orange-600">{isProvider ? "تأكيد الكود والانتقال للخطوة التالية" : "تأكيد البريد"}</button>
        </form>
        <form action="/api/auth/resend-otp" method="POST" className="mt-4">
          <input type="hidden" name="email" value={email}/>
          <button type="submit" className="w-full rounded-xl border border-orange-300 px-5 py-3.5 text-base font-bold text-orange-700">إعادة إرسال الكود</button>
        </form>
        <Link href="/register" className="mt-6 block text-center text-base font-bold text-slate-600">العودة لإنشاء الحساب</Link>
      </section>
    </main>
  );
}
