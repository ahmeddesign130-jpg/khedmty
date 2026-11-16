"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "تعذر تسجيل الدخول.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setMessage("تعذر الاتصال بالخادم.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 shadow-xl">
        <Link href="/" className="text-2xl font-extrabold">
          خِدمتي<span className="text-orange-500">.</span>
        </Link>

        <h1 className="mt-8 text-2xl font-extrabold">أهلاً بعودتك</h1>
        <p className="mt-2 text-sm leading-7 text-slate-500">
          سجّل دخولك لمتابعة حسابك على خِدمتي.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <label className="block text-sm font-bold">
            البريد الإلكتروني
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-400"
              dir="ltr"
            />
          </label>

          <label className="block text-sm font-bold">
            كلمة المرور
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-400"
              dir="ltr"
            />
          </label>

          <button
            disabled={busy}
            className="w-full rounded-xl bg-orange-500 px-4 py-4 font-bold text-white disabled:opacity-60"
          >
            {busy ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}
          </button>

          {message && (
            <p role="status" className="text-sm leading-7 text-red-600">
              {message}
            </p>
          )}
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          ليس لديك حساب؟{" "}
          <Link className="font-bold text-orange-600" href="/register">
            أنشئ حسابًا جديدًا
          </Link>
        </p>
      </div>
    </main>
  );
}
