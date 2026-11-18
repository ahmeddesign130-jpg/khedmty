import Link from "next/link";

const errors:Record<string,string> = {
 missing:"اكتب البريد الإلكتروني وكلمة المرور.",
 invalid:"البريد الإلكتروني أو كلمة المرور غير صحيحة.",
 suspended:"هذا الحساب موقوف. تواصل مع إدارة خِدمتي.",
 server:"حصل خطأ أثناء تسجيل الدخول. حاول مرة أخرى بعد قليل."
};
export default async function LoginPage({searchParams}:{searchParams:Promise<{error?:string;registered?:string}>}) {
 const params=await searchParams;
 return <main dir="rtl" className="flex min-h-screen items-center justify-center bg-[#f5f6f8] px-5 py-10">
 <section className="w-full max-w-md rounded-3xl bg-white p-7 shadow-lg md:p-10">
 <Link href="/" className="block text-center text-3xl font-black text-orange-500">خِدمتي</Link>
 <h1 className="mt-8 text-center text-2xl font-black text-[#14213d]">تسجيل الدخول</h1>
 <p className="mt-3 text-center text-sm text-slate-500">سجّل دخولك للوصول إلى حسابك ومتابعة طلباتك.</p>
 {params.registered==="1"&&<p role="status" className="mt-5 rounded-xl bg-green-50 p-4 text-sm font-bold text-green-700">تم إنشاء حسابك بنجاح. سجّل الدخول باستخدام البريد وكلمة المرور.</p>}
 {params.error&&<p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">{errors[params.error]||errors.server}</p>}
 <form action="/api/auth/login" method="POST" className="mt-8 space-y-5">
 <div><label htmlFor="email" className="mb-2 block text-sm font-bold text-slate-700">البريد الإلكتروني</label><input id="email" name="email" type="email" autoComplete="email" required placeholder="name@example.com" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left outline-none focus:border-orange-500" dir="ltr"/></div>
 <div><label htmlFor="password" className="mb-2 block text-sm font-bold text-slate-700">كلمة المرور</label><input id="password" name="password" type="password" autoComplete="current-password" required placeholder="أدخل كلمة المرور" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left outline-none focus:border-orange-500" dir="ltr"/></div>
 <button type="submit" className="w-full rounded-xl bg-orange-500 px-5 py-4 font-black text-white transition hover:bg-orange-600">دخول</button></form>
 <p className="mt-7 text-center text-sm text-slate-600">ليس لديك حساب؟ <Link href="/register" className="font-black text-orange-600">إنشاء حساب</Link></p>
 <Link href="/" className="mt-5 block text-center text-sm font-bold text-slate-500">العودة للرئيسية</Link>
 </section></main>;
}
