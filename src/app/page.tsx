"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function HomePage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/register", { method: "GET", cache: "no-store" })
      .then(async (response) => {
        if (response.ok) {
          const data = await response.json();
          setLoggedIn(Boolean(data.user));
        }
      })
      .catch(() => setLoggedIn(false))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <Link href="/" className="text-2xl font-extrabold">
            خِدمتي<span className="text-orange-500">.</span>
          </Link>

          <div className="flex items-center gap-3">
            {loading ? (
              <span className="text-sm text-slate-400">جارٍ التحميل...</span>
            ) : loggedIn ? (
              <Link href="/services" className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white">
                تصفح الخدمات
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-bold">
                  تسجيل الدخول
                </Link>
                <Link href="/register" className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white">
                  إنشاء حساب
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-24 md:grid-cols-2">
        <div>
          <span className="inline-block rounded-full bg-orange-100 px-4 py-2 text-sm font-bold text-orange-700">
            منصة خِدمتي للخدمات الرقمية
          </span>

          <h1 className="mt-7 text-4xl font-black leading-tight md:text-6xl">
            مهارتك تستحق
            <span className="block text-orange-500">التميز.</span>
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-9 text-slate-500">
            اكتشف خدمات احترافية، وتواصل مع أصحاب المهارات، وابدأ تنفيذ أفكارك بسهولة وأمان.
          </p>

          {!loading && !loggedIn && (
            <div className="mt-9 flex flex-wrap gap-4">
              <Link href="/register" className="rounded-xl bg-orange-500 px-7 py-4 font-bold text-white shadow-lg shadow-orange-500/20">
                ابدأ الآن
              </Link>
              <Link href="/login" className="rounded-xl border border-slate-200 bg-white px-7 py-4 font-bold">
                لدي حساب بالفعل
              </Link>
            </div>
          )}

          {!loading && loggedIn && (
            <Link href="/services" className="mt-9 inline-block rounded-xl bg-orange-500 px-7 py-4 font-bold text-white">
              استكشف الخدمات
            </Link>
          )}
        </div>

        <div className="rounded-[2rem] bg-slate-900 p-8 text-white shadow-2xl">
          <div className="rounded-3xl bg-white/10 p-7">
            <p className="text-sm text-orange-300">خِدمتي Khedmty</p>
            <h2 className="mt-5 text-3xl font-extrabold leading-relaxed">
              مكان واحد يجمع
              <span className="block text-orange-400">العملاء بالمحترفين</span>
            </h2>
            <p className="mt-5 leading-8 text-slate-300">
              خدمات متنوعة، وتجربة بسيطة، ومتابعة واضحة لطلباتك.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <h2 className="text-2xl font-extrabold">ابدأ رحلتك على خِدمتي</h2>
        <div className="mt-7 grid gap-5 md:grid-cols-3">
          {[
            ["01", "اكتشف الخدمات", "ابحث عن الخدمة المناسبة لاحتياجاتك."],
            ["02", "اختر المحترف", "اطلع على تفاصيل الخدمة ومقدمها."],
            ["03", "تابع طلبك", "تابع حالة طلبك من حسابك."]
          ].map(([number, title, description]) => (
            <div key={number} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <span className="text-sm font-extrabold text-orange-500">{number}</span>
              <h3 className="mt-4 text-lg font-extrabold">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-500">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-7 text-center text-sm text-slate-400">
        خِدمتي — مهارتك تستحق التميز
      </footer>
    </main>
  );
}
