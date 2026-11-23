"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const steps = [
  { title: "البيانات الشخصية", hint: "معلوماتك الأساسية للتحقق من هويتك" },
  { title: "بيانات العمل", hint: "المجال والخبرة والخدمات التي تقدمها" },
  { title: "إثبات الهوية", hint: "صور البطاقة ثم إرسال الطلب للإدارة" },
];

export default function ProviderVerificationForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  function nextStep() {
    setError("");
    const form = document.getElementById("provider-verification-form") as HTMLFormElement | null;
    const current = form?.querySelector(`fieldset[data-step="${step}"]`);
    const fields = current?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea");
    const invalid = fields ? Array.from(fields).find((field) => !field.checkValidity()) : null;
    if (invalid) {
      invalid.reportValidity();
      invalid.focus();
      return;
    }
    setStep((value) => Math.min(value + 1, steps.length - 1));
  }

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
    if (front.size > 8 * 1024 * 1024 || back.size > 8 * 1024 * 1024) {
      setError("حجم كل صورة يجب ألا يتجاوز 8 MB.");
      return;
    }
    if (front.type && !["image/jpeg", "image/png", "image/webp"].includes(front.type)) {
      setError("صيغة صورة البطاقة الأمامية غير مدعومة.");
      return;
    }
    if (back.type && !["image/jpeg", "image/png", "image/webp"].includes(back.type)) {
      setError("صيغة صورة البطاقة الخلفية غير مدعومة.");
      return;
    }
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

  return <form id="provider-verification-form" onSubmit={submit} noValidate className="mt-6">
    <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
      <p className="font-black text-orange-900">الخطوة 3 من 4: استكمال بيانات مقدم الخدمة</p>
      <p className="mt-1 text-sm leading-7 text-orange-800">هنقسم بياناتك إلى 3 أجزاء قصيرة. بعد تأكيدها تُرسل للأدمن للمراجعة، ولن يتحول حسابك إلى مقدم خدمة إلا بعد موافقة الإدارة.</p>
    </div>

    <div className="mt-5 grid grid-cols-3 gap-2" aria-label="مراحل استكمال بيانات مقدم الخدمة">
      {steps.map((item, index) => <div key={item.title} className={`rounded-xl border p-2 text-center transition ${index === step ? "border-orange-300 bg-orange-100 text-orange-900" : index < step ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
        <span className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-black">{index < step ? "✓" : index + 1}</span>
        <span className="mt-1 block text-[11px] font-black sm:text-xs">{item.title}</span>
      </div>)}
    </div>

    <div className="mt-5 rounded-2xl border border-slate-100 bg-white p-4 sm:p-5">
      <p className="text-xs font-bold text-orange-600">الجزء {step + 1} من 3</p>
      <h2 className="mt-1 text-xl font-black text-[#14213d]">{steps[step].title}</h2>
      <p className="mt-1 text-sm text-slate-500">{steps[step].hint}</p>

      <fieldset data-step="0" hidden={step !== 0} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold text-slate-700 sm:col-span-2">الاسم بالكامل كما في البطاقة
          <input name="fullName" required minLength={3} maxLength={100} autoComplete="name" className="mt-2 w-full rounded-xl border border-slate-200 p-3"/>
        </label>
        <label className="text-sm font-bold text-slate-700">رقم الهاتف
          <input name="phone" type="tel" inputMode="numeric" required pattern="01[0125][0-9]{8}" maxLength={11} dir="ltr" autoComplete="tel" className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-left" placeholder="01xxxxxxxxx"/>
        </label>
        <label className="text-sm font-bold text-slate-700">تاريخ الميلاد
          <input name="dateOfBirth" type="date" required max={new Date(Date.now() - 18*365.25*24*60*60*1000).toISOString().slice(0,10)} className="mt-2 w-full rounded-xl border border-slate-200 p-3"/>
        </label>
        <label className="text-sm font-bold text-slate-700 sm:col-span-2">الرقم القومي (14 رقمًا)
          <input name="nationalId" type="password" inputMode="numeric" autoComplete="off" required pattern="[0-9]{14}" minLength={14} maxLength={14} dir="ltr" className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-left"/>
        </label>
      </fieldset>

      <fieldset data-step="1" hidden={step !== 1} className="mt-5 grid gap-4">
        <label className="text-sm font-bold text-slate-700">مجال الخدمة أو المهنة
          <input name="profession" required minLength={2} maxLength={80} className="mt-2 w-full rounded-xl border border-slate-200 p-3" placeholder="مثال: تصميم الجرافيك"/>
        </label>
        <label className="text-sm font-bold text-slate-700">الخبرة السابقة
          <textarea name="experience" maxLength={500} rows={3} className="mt-2 w-full rounded-xl border border-slate-200 p-3" placeholder="اكتب خبراتك السابقة إن وجدت"/>
        </label>
        <label className="text-sm font-bold text-slate-700">نبذة عنك وعن الخدمات التي تقدمها
          <textarea name="bio" required minLength={20} maxLength={1000} rows={5} className="mt-2 w-full rounded-xl border border-slate-200 p-3" placeholder="عرّفنا بنفسك وبخبرتك والخدمات التي تقدمها"/>
          <span className="mt-1 block text-xs font-normal text-slate-500">اكتب 20 حرفًا على الأقل.</span>
        </label>
      </fieldset>

      <fieldset data-step="2" hidden={step !== 2} className="mt-5 grid gap-4">
        <label className="block text-sm font-bold text-slate-700">صورة البطاقة — الوجه الأمامي
          <input type="file" accept="image/jpeg,image/png,image/webp" required onChange={event => setFront(event.target.files?.[0] || null)} className="mt-2 block w-full rounded-xl border border-slate-200 p-3 text-sm"/>
          <span className="mt-1 block text-xs font-normal text-slate-500">{front ? front.name : "JPG أو PNG أو WEBP — حتى 8 MB"}</span>
        </label>
        <label className="block text-sm font-bold text-slate-700">صورة البطاقة — الوجه الخلفي
          <input type="file" accept="image/jpeg,image/png,image/webp" required onChange={event => setBack(event.target.files?.[0] || null)} className="mt-2 block w-full rounded-xl border border-slate-200 p-3 text-sm"/>
          <span className="mt-1 block text-xs font-normal text-slate-500">{back ? back.name : "JPG أو PNG أو WEBP — حتى 8 MB"}</span>
        </label>
        <div className="rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
          بياناتك الشخصية والرقم القومي وصور البطاقة خاصة، ولا تظهر للعملاء. يتم حفظ الرقم القومي مشفّرًا والصور في مساحة تخزين خاصة، ويستطيع مسؤولو خِدمتي المخوّلون فقط مراجعتها.
        </div>
      </fieldset>
    </div>

    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
    {progress && <p role="status" aria-live="polite" className="mt-4 rounded-xl bg-blue-50 p-3 text-sm font-bold text-blue-700">{progress}</p>}

    <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
      <button type="button" disabled={step === 0 || busy} onClick={() => { setError(""); setStep(value => Math.max(0, value - 1)); }} className="min-h-12 rounded-xl border border-slate-200 px-5 font-bold text-slate-700 disabled:opacity-40">السابق</button>
      {step < steps.length - 1
        ? <button type="button" onClick={nextStep} className="min-h-12 rounded-xl bg-orange-500 px-6 font-black text-white shadow-md shadow-orange-500/20">التالي: {steps[step + 1].title}</button>
        : <button type="submit" disabled={busy} className="min-h-12 rounded-xl bg-orange-500 px-6 font-black text-white shadow-md shadow-orange-500/20 disabled:opacity-50">{busy ? "يرجى الانتظار..." : "تأكيد البيانات وإرسال الطلب للأدمن"}</button>}
    </div>
  </form>;
}
