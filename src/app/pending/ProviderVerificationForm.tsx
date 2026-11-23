"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function ProviderVerificationForm() {
  const router = useRouter();
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  async function upload(file: File) {
    const signedResponse = await fetch("/api/uploads/sign", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "provider-verification", name: file.name, mimeType: file.type, size: file.size }),
    });
    const signed = await signedResponse.json();
    if (!signedResponse.ok) throw new Error(signed.message || "تعذر تجهيز رفع صورة البطاقة.");
    const response = await fetch(signed.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
    if (!response.ok) throw new Error("فشل رفع صورة البطاقة. حاول بصورة أخرى.");
    return String(signed.objectPath);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!front || !back) { setError("ارفع صورة البطاقة من الأمام والخلف."); return; }
    if (front.size > 8 * 1024 * 1024 || back.size > 8 * 1024 * 1024) { setError("حجم كل صورة يجب ألا يتجاوز 8 MB."); return; }
    setBusy(true);
    try {
      const form = new FormData(event.currentTarget);
      setProgress("جاري رفع صورة البطاقة الأمامية...");
      const idFrontPath = await upload(front);
      setProgress("جاري رفع صورة البطاقة الخلفية...");
      const idBackPath = await upload(back);
      setProgress("جاري إرسال الطلب للإدارة...");
      const response = await fetch("/api/provider/verification", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.get("fullName"), phone: form.get("phone"), dateOfBirth: form.get("dateOfBirth"),
          nationalId: form.get("nationalId"), profession: form.get("profession"),
          experience: form.get("experience"), bio: form.get("bio"), idFrontPath, idBackPath,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "تعذر إرسال الطلب.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "حدث خطأ غير متوقع.");
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  return <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
    <label className="text-sm font-bold text-slate-700">الاسم بالكامل كما في البطاقة
      <input name="fullName" required minLength={3} maxLength={100} className="mt-2 w-full rounded-xl border border-slate-200 p-3"/>
    </label>
    <label className="text-sm font-bold text-slate-700">رقم الهاتف
      <input name="phone" type="tel" inputMode="numeric" required pattern="01[0125][0-9]{8}" maxLength={11} dir="ltr" className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-left" placeholder="01xxxxxxxxx"/>
    </label>
    <label className="text-sm font-bold text-slate-700">تاريخ الميلاد
      <input name="dateOfBirth" type="date" required max={new Date(Date.now() - 18*365.25*24*60*60*1000).toISOString().slice(0,10)} className="mt-2 w-full rounded-xl border border-slate-200 p-3"/>
    </label>
    <label className="text-sm font-bold text-slate-700">الرقم القومي (14 رقمًا)
      <input name="nationalId" type="password" inputMode="numeric" autoComplete="off" required pattern="[0-9]{14}" minLength={14} maxLength={14} dir="ltr" className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-left"/>
    </label>
    <label className="text-sm font-bold text-slate-700 sm:col-span-2">مجال الخدمة أو المهنة
      <input name="profession" required minLength={2} maxLength={80} className="mt-2 w-full rounded-xl border border-slate-200 p-3" placeholder="مثال: تصميم الجرافيك"/>
    </label>
    <label className="text-sm font-bold text-slate-700 sm:col-span-2">الخبرة السابقة
      <textarea name="experience" maxLength={500} rows={2} className="mt-2 w-full rounded-xl border border-slate-200 p-3"/>
    </label>
    <label className="text-sm font-bold text-slate-700 sm:col-span-2">نبذة عنك
      <textarea name="bio" required minLength={20} maxLength={1000} rows={4} className="mt-2 w-full rounded-xl border border-slate-200 p-3" placeholder="عرّفنا بنفسك وبخبرتك والخدمات التي تقدمها"/>
    </label>
    <label className="block text-sm font-bold text-slate-700">صورة البطاقة — الوجه الأمامي
      <input type="file" accept="image/jpeg,image/png,image/webp" required onChange={e => setFront(e.target.files?.[0] || null)} className="mt-2 block w-full rounded-xl border border-slate-200 p-3 text-sm"/>
      <span className="mt-1 block text-xs font-normal text-slate-500">{front ? front.name : "JPG أو PNG أو WEBP — حتى 8 MB"}</span>
    </label>
    <label className="block text-sm font-bold text-slate-700">صورة البطاقة — الوجه الخلفي
      <input type="file" accept="image/jpeg,image/png,image/webp" required onChange={e => setBack(e.target.files?.[0] || null)} className="mt-2 block w-full rounded-xl border border-slate-200 p-3 text-sm"/>
      <span className="mt-1 block text-xs font-normal text-slate-500">{back ? back.name : "JPG أو PNG أو WEBP — حتى 8 MB"}</span>
    </label>
    <div className="rounded-xl bg-orange-50 p-4 text-sm leading-7 text-orange-900 sm:col-span-2">
      بياناتك الشخصية والرقم القومي وصور البطاقة خاصة، ولا تظهر للعملاء. يتم حفظ الرقم القومي مشفّرًا والصور في مساحة تخزين خاصة، ويستطيع مسؤولو خِدمتي المخوّلون فقط مراجعتها.
    </div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700 sm:col-span-2">{error}</p>}
    {progress && <p role="status" aria-live="polite" className="rounded-xl bg-blue-50 p-3 text-sm font-bold text-blue-700 sm:col-span-2">{progress}</p>}
    <button type="submit" disabled={busy} className="rounded-xl bg-orange-500 px-5 py-4 font-black text-white disabled:opacity-50 sm:col-span-2">{busy ? "يرجى الانتظار..." : "إرسال بيانات التحقق للإدارة"}</button>
  </form>;
}
