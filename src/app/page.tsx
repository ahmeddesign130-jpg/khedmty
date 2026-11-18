import Link from "next/link";

const steps = [
  { number: "01", title: "أنشئ حسابك", description: "سجّل كعميل أو مقدم خدمة في خطوات بسيطة." },
  { number: "02", title: "ابدأ بثقة", description: "تابع طلباتك وخدماتك من لوحة حسابك." },
  { number: "03", title: "أنجز واستلم", description: "تابع التنفيذ حتى استلام الخدمة." },
];

export default function HomePage() {
  return (
    <main dir="rtl" className="min-h-screen bg-[#f6f7fb] text-[#14213d]">
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="text-2xl font-black tracking-tight text-orange-600">خِدمتي</Link>
          <nav className="flex items-center gap-3">
            <Link href="/login" className="rounded-xl px-3 py-2 text-sm font-bold text-[#14213d] hover:bg-slate-50">تسجيل الدخول</Link>
            <Link href="/register" className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600">إنشاء حساب</Link>
          </nav>
        </div>
      </header>

      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#14213d] via-[#192b4c] to-[#243b61]" />
        <div className="absolute -left-24 -top-24 -z-10 h-80 w-80 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute -bottom-32 right-0 -z-10 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 text-white md:grid-cols-[1.2fr_.8fr] md:py-28">
          <div>
            <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-orange-200">منصة خِدمتي للخدمات المستقلة</span>
            <h1 className="mt-7 text-4xl font-black leading-[1.5] md:text-6xl">مهارتك تستحق <span className="text-orange-400">التميز</span></h1>
            <p className="mt-6 max-w-xl text-base leading-9 text-slate-200 md:text-lg">مساحة تجمع أصحاب المهارات بالعملاء، وتساعدك تدير حسابك وطلباتك وخدماتك بسهولة وأمان.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/register" className="rounded-2xl bg-orange-500 px-7 py-4 font-bold text-white shadow-xl shadow-orange-950/20 hover:-translate-y-0.5 hover:bg-orange-600">ابدأ رحلتك الآن</Link>
              <Link href="/login" className="rounded-2xl border border-white/25 bg-white/10 px-7 py-4 font-bold text-white hover:bg-white/15">لديك حساب؟ دخول</Link>
            </div>
            <p className="mt-5 text-xs text-slate-300">التسجيل كعميل متاح فورًا، وحساب مقدم الخدمة يمر بمراجعة الإدارة.</p>
          </div>
          <div className="mx-auto w-full max-w-sm">
            <div className="rounded-[30px] border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur">
              <div className="rounded-3xl bg-white p-6 text-[#14213d]">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-500">مرحبًا بك في</span>
                  <span className="rounded-xl bg-orange-50 px-3 py-2 text-sm font-black text-orange-600">Khedmty</span>
                </div>
                <div className="mt-7 rounded-2xl bg-gradient-to-l from-orange-500 to-orange-400 p-5 text-white">
                  <p className="text-sm text-orange-50">شعارنا</p>
                  <p className="mt-2 text-2xl font-black">مهارتك تستحق التميز</p>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-50 p-4"><span className="text-xs text-slate-500">للعملاء</span><p className="mt-2 font-black">اطلب بثقة</p></div>
                  <div className="rounded-2xl bg-slate-50 p-4"><span className="text-xs text-slate-500">للمستقلين</span><p className="mt-2 font-black">اعرض مهارتك</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 md:py-20">
        <div className="text-center">
          <span className="text-sm font-bold text-orange-600">ببساطة ووضوح</span>
          <h2 className="mt-3 text-3xl font-black text-[#14213d]">ابدأ مع خِدمتي في 3 خطوات</h2>
          <p className="mt-4 text-sm leading-8 text-slate-500">كل ما تحتاجه لإدارة تجربتك في مكان واحد.</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {steps.map((step) => (
            <article key={step.number} className="rounded-3xl border border-slate-100 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-lg font-black text-orange-600">{step.number}</span>
              <h3 className="mt-5 text-xl font-black">{step.title}</h3>
              <p className="mt-3 text-sm leading-8 text-slate-500">{step.description}</p>
            </article>
          ))}
        </div>
      </section>
      <footer className="border-t border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500">خِدمتي — مهارتك تستحق التميز</footer>
    </main>
  );
}
