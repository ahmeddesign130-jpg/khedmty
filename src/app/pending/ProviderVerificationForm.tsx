"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const steps = [
  { title: "بياناتك الأساسية", hint: "معلومات التواصل والتعريف بنفسك" },
  { title: "خبراتك ومهاراتك", hint: "مجال عملك وخبرتك ونماذج من أعمالك" },
];

export default function ProviderVerificationForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");

  function handleNationalId(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 14);
    setNationalId(digits);
    setDateOfBirth("");
    if (digits.length !== 14 || !/[23]/.test(digits[0])) return;
    const year = (digits[0] === "2" ? 1900 : 2000) + Number(digits.slice(1, 3));
    const month = Number(digits.slice(3, 5));
    const day = Number(digits.slice(5, 7));
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
      setDateOfBirth(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
    }
  }

  function nextStep() {
    setError("");
    const form = document.getElementById("provider-verification-form") as HTMLFormElement | null;
    const current = form?.querySelector(`fieldset[data-step="${step}"]`);
    const fields = current?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea");
    const invalid = fields ? Array.from(fields).find(field => !field.checkValidity()) : null;
    if (invalid) { invalid.reportValidity(); invalid.focus(); return; }
    setStep(value => Math.min(value + 1, steps.length - 1));
  }

  async function upload(file: File) {
    const signedResponse = await fetch("/api/uploads/sign", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "provider-portfolio", name: file.name, mimeType: file.type, size: file.size }),
    });
    const signed = await signedResponse.json();
    if (!signedResponse.ok) throw new Error(signed.message || "تعذر تجهيز رفع نموذج العمل.");
    const response = await fetch(signed.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
    if (!response.ok) throw new Error("فشل رفع أحد الملفات. حاول مرة أخرى.");
    return String(signed.objectPath);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (nationalId.length !== 14 || !dateOfBirth) { setError("اكتب رقمًا قوميًا مصريًا صحيحًا من 14 رقمًا للتأكد من تاريخ الميلاد."); setStep(0); return; }
    if (files.length < 1 || files.length > 5) { setError("ارفع نموذج عمل واحدًا على الأقل وبحد أقصى 5 ملفات."); return; }
    for (const file of files) {
      const video = file.type.startsWith("video/");
      if (video ? file.size > 40 * 1024 * 1024 : file.size > 8 * 1024 * 1024) {
        setError("حجم الصورة حتى 8 MB والفيديو حتى 40 MB."); return;
      }
      if (!["image/jpeg","image/png","image/webp","video/mp4","video/webm","video/quicktime"].includes(file.type)) {
        setError("الصيغ المسموحة: JPG وPNG وWEBP وMP4 وWEBM وMOV."); return;
      }
    }
    setBusy(true);
    try {
      const form = new FormData(event.currentTarget);
      const portfolioPaths: string[] = [];
      for (let i = 0; i < files.length; i++) {
        setProgress(`جاري رفع نموذج العمل ${i + 1} من ${files.length}...`);
        portfolioPaths.push(await upload(files[i]));
      }
      setProgress("جاري إرسال طلبك إلى الإدارة...");
      const response = await fetch("/api/provider/verification", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.get("fullName"), phone: form.get("phone"), nationalId, dateOfBirth,
          profession: form.get("profession"), experience: form.get("experience"),
          bio: form.get("bio"), portfolioPaths,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "تعذر إرسال الطلب.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "حدث خطأ غير متوقع.");
    } finally { setBusy(false); setProgress(""); }
  }

  return <form id="provider-verification-form" onSubmit={submit} noValidate className="mt-6">
    <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
      <p className="font-black text-orange-900">استكمال طلب الانضمام كمقدم خدمة</p>
      <p className="mt-1 text-sm leading-7 text-orange-800">كل حساب مقدم خدمة يخضع لمراجعة الإدارة قبل التفعيل. نحتاج الرقم القومي لاستخراج تاريخ الميلاد تلقائيًا، ولا نحفظ الرقم القومي الكامل.</p>
    </div>
    <div className="mt-5 grid grid-cols-2 gap-2" aria-label="مراحل استكمال بيانات مقدم الخدمة">
      {steps.map((item,index)=><div key={item.title} className={`rounded-xl border p-3 text-center ${index===step?"border-orange-300 bg-orange-100 text-orange-900":index<step?"border-emerald-200 bg-emerald-50 text-emerald-800":"border-slate-200 bg-slate-50 text-slate-500"}`}>
        <span className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-black">{index<step?"✓":index+1}</span>
        <span className="mt-1 block text-xs font-black">{item.title}</span>
      </div>)}
    </div>
    <div className="mt-5 rounded-2xl border border-slate-100 bg-white p-4 sm:p-5">
      <p className="text-xs font-bold text-orange-600">الجزء {step+1} من 2</p>
      <h2 className="mt-1 text-xl font-black text-[#14213d]">{steps[step].title}</h2>
      <p className="mt-1 text-sm text-slate-500">{steps[step].hint}</p>
      <fieldset data-step="0" hidden={step!==0} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold text-slate-700 sm:col-span-2">اسمك بالكامل
          <input name="fullName" required minLength={3} maxLength={100} autoComplete="name" className="mt-2 w-full rounded-xl border border-slate-200 p-3"/>
        </label>
        <label className="text-sm font-bold text-slate-700">رقم الهاتف
          <input name="phone" type="tel" inputMode="numeric" required pattern="01[0125][0-9]{8}" maxLength={11} dir="ltr" autoComplete="tel" className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-left" placeholder="01xxxxxxxxx"/>
        </label>
        <label className="text-sm font-bold text-slate-700 sm:col-span-2">الرقم القومي (14 رقمًا)
          <input name="nationalId" type="text" inputMode="numeric" autoComplete="off" required value={nationalId} onChange={event=>handleNationalId(event.target.value)} pattern="[23][0-9]{13}" maxLength={14} dir="ltr" className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-left tracking-widest" placeholder="اكتب الرقم القومي كاملًا — الأرقام ظاهرة أثناء الكتابة"/>
          <span className="mt-1 block text-xs font-normal text-slate-500">الأرقام ظاهرة أمامك أثناء الكتابة. نستخدمه لاستخراج تاريخ الميلاد فقط ولا نحفظ الرقم كاملًا.</span>
        </label>
        <label className="text-sm font-bold text-slate-700">تاريخ الميلاد (يُستخرج تلقائيًا)
          <input name="dateOfBirth" type="date" value={dateOfBirth} readOnly required className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-700"/>
        </label>
        <label className="text-sm font-bold text-slate-700 sm:col-span-2">مجال الخدمة أو المهنة
          <input name="profession" required minLength={2} maxLength={80} className="mt-2 w-full rounded-xl border border-slate-200 p-3" placeholder="مثال: تصميم الجرافيك"/>
        </label>
      </fieldset>
      <fieldset data-step="1" hidden={step!==1} className="mt-5 grid gap-4">
        <label className="text-sm font-bold text-slate-700">الخبرة السابقة
          <textarea name="experience" maxLength={1000} rows={3} className="mt-2 w-full rounded-xl border border-slate-200 p-3" placeholder="اكتب خبراتك ومشروعاتك السابقة"/>
        </label>
        <label className="text-sm font-bold text-slate-700">نبذة عنك وعن الخدمات التي تقدمها
          <textarea name="bio" required minLength={30} maxLength={1500} rows={5} className="mt-2 w-full rounded-xl border border-slate-200 p-3" placeholder="عرّفنا بنفسك ومهاراتك وطريقة عملك"/>
        </label>
        <label className="block text-sm font-bold text-slate-700">نماذج من أعمالك (مطلوب من 1 إلى 5 ملفات)
          <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" multiple required onChange={event=>setFiles(Array.from(event.target.files||[]))} className="mt-2 block w-full rounded-xl border border-slate-200 p-3 text-sm"/>
          <span className="mt-1 block text-xs font-normal text-slate-500">صور JPG/PNG/WEBP حتى 8 MB، أو فيديو MP4/WEBM/MOV حتى 40 MB. الملفات تظهر للأدمن فقط أثناء المراجعة.</span>
        </label>
        {files.length>0&&<p className="text-sm font-bold text-slate-600">تم اختيار {files.length} ملف</p>}
      </fieldset>
    </div>
    {error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
    {progress&&<p role="status" aria-live="polite" className="mt-4 rounded-xl bg-blue-50 p-3 text-sm font-bold text-blue-700">{progress}</p>}
    <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
      <button type="button" disabled={step===0||busy} onClick={()=>{setError("");setStep(value=>Math.max(0,value-1));}} className="min-h-12 rounded-xl border border-slate-200 px-6 py-3 font-bold text-slate-700 disabled:opacity-40">رجوع</button>
      {step===0?<button type="button" onClick={nextStep} className="min-h-12 rounded-xl bg-orange-500 px-7 py-3 font-black text-white">التالي</button>:<button type="submit" disabled={busy} className="min-h-12 rounded-xl bg-orange-500 px-7 py-3 font-black text-white disabled:opacity-50">{busy?"جاري الإرسال...":"إرسال للمراجعة"}</button>}
    </div>
  </form>;
}
