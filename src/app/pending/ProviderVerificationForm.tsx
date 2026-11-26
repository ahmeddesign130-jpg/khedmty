"use client";

import { useEffect, useState, type FormEvent, type FocusEvent, type ChangeEvent } from "react";

const steps = [
  { title: "بياناتك الأساسية", hint: "معلومات التواصل والتعريف بنفسك" },
  { title: "خبراتك ومهاراتك", hint: "مجال عملك وخبرتك ونماذج من أعمالك" },
];

type Draft = {
  fullName?: string; phone?: string; profession?: string; experience?: string;
  bio?: string; dateOfBirth?: string; portfolioPaths?: string[];
};

export default function ProviderVerificationForm() {
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [portfolioPaths, setPortfolioPaths] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftStatus, setDraftStatus] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/provider/verification", { cache: "no-store" })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (!active || !data?.draft) return;
        const draft = data.draft as Draft;
        const form = document.getElementById("provider-verification-form") as HTMLFormElement | null;
        if (!form) return;
        for (const name of ["fullName", "phone", "profession", "experience", "bio"]) {
          const field = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;
          const value = draft[name as keyof Draft];
          if (field && typeof value === "string") field.value = value;
        }
        if (typeof draft.dateOfBirth === "string") setDateOfBirth(draft.dateOfBirth);
        if (Array.isArray(draft.portfolioPaths)) setPortfolioPaths(draft.portfolioPaths.slice(0, 5));
        setDraftStatus("استعدنا بياناتك المحفوظة. أكمل من حيث توقفت. لأسباب أمنية، أعد إدخال الرقم القومي لاستخراج تاريخ الميلاد عند الإرسال.");
      })
      .catch(() => { if (active) setDraftStatus("لم نتمكن من تحميل المسودة؛ يمكنك متابعة الكتابة وسيتم حفظها."); })
      .finally(() => { if (active) setDraftLoaded(true); });
    return () => { active = false; };
  }, []);

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

  function formValues(form: HTMLFormElement) {
    const data = new FormData(form);
    return {
      fullName: String(data.get("fullName") || ""),
      phone: String(data.get("phone") || ""),
      profession: String(data.get("profession") || ""),
      experience: String(data.get("experience") || ""),
      bio: String(data.get("bio") || ""),
      dateOfBirth,
      portfolioPaths,
    };
  }

  async function persistDraft(form: HTMLFormElement, paths = portfolioPaths) {
    if (!draftLoaded || submitted) return;
    const payload = { ...formValues(form), portfolioPaths: paths };
    if (![payload.fullName, payload.phone, payload.profession, payload.experience, payload.bio].some(value => value.trim())) return;
    setDraftStatus("جاري حفظ بياناتك بأمان...");
    try {
      const response = await fetch("/api/provider/verification", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("save");
      setDraftStatus("تم حفظ بياناتك تلقائيًا.");
    } catch {
      setDraftStatus("تعذر حفظ المسودة الآن. اترك الصفحة مفتوحة وحاول مرة أخرى.");
    }
  }

  function handleBlur(event: FocusEvent<HTMLFormElement>) {
    const next = event.relatedTarget as HTMLElement | null;
    if (next?.closest("#provider-verification-form")) {
      void persistDraft(event.currentTarget);
    } else {
      void persistDraft(event.currentTarget);
    }
  }

  function nextStep() {
    setError("");
    const form = document.getElementById("provider-verification-form") as HTMLFormElement | null;
    const current = form?.querySelector(`fieldset[data-step="${step}"]`);
    const fields = current?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input:not([type=file]), textarea");
    const invalid = fields ? Array.from(fields).find(field => !field.checkValidity()) : null;
    if (invalid) { invalid.reportValidity(); invalid.focus(); return; }
    if (form) void persistDraft(form);
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

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || []);
    if (!selected.length) return;
    if (portfolioPaths.length + selected.length > 5) { setError("يمكن حفظ 5 نماذج أعمال كحد أقصى."); event.target.value = ""; return; }
    for (const file of selected) {
      const video = file.type.startsWith("video/");
      if (video ? file.size > 40 * 1024 * 1024 : file.size > 8 * 1024 * 1024) {
        setError("حجم الصورة حتى 8 MB والفيديو حتى 40 MB."); event.target.value = ""; return;
      }
      if (!["image/jpeg","image/png","image/webp","video/mp4","video/webm","video/quicktime"].includes(file.type)) {
        setError("الصيغ المسموحة: JPG وPNG وWEBP وMP4 وWEBM وMOV."); event.target.value = ""; return;
      }
    }
    setError("");
    setUploading(true);
    setFiles(selected);
    try {
      const added: string[] = [];
      for (let i = 0; i < selected.length; i++) {
        setProgress(`جاري حفظ نموذج العمل ${i + 1} من ${selected.length}...`);
        added.push(await upload(selected[i]));
      }
      const updated = [...portfolioPaths, ...added];
      setPortfolioPaths(updated);
      const form = document.getElementById("provider-verification-form") as HTMLFormElement | null;
      if (form) await persistDraft(form, updated);
      setDraftStatus("تم رفع وحفظ نماذج أعمالك. ستجدها عند العودة لحسابك.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر رفع نماذج الأعمال.");
    } finally {
      setUploading(false);
      setProgress("");
      event.target.value = "";
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (nationalId.length !== 14 || !dateOfBirth) { setError("أعد إدخال رقم قومي مصري صحيح من 14 رقمًا للتأكد من تاريخ الميلاد."); setStep(0); return; }
    if (uploading || portfolioPaths.length < 1 || portfolioPaths.length > 5) { setError("ارفع نموذج عمل واحدًا على الأقل (حتى 5 ملفات) وانتظر اكتمال الرفع."); return; }
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const fullName = String(form.get("fullName") || "").trim();
    const phone = String(form.get("phone") || "").trim();
    const profession = String(form.get("profession") || "").trim();
    const bio = String(form.get("bio") || "").trim();
    if (fullName.length < 3) { setError("اكتب اسمك بالكامل (3 أحرف على الأقل)."); setStep(0); return; }
    if (!/^01[0125][0-9]{8}$/.test(phone)) { setError("اكتب رقم هاتف مصري صحيح مكوّنًا من 11 رقمًا."); setStep(0); return; }
    if (profession.length < 2) { setError("اكتب مجال الخدمة أو المهنة."); setStep(0); return; }
    if (bio.length < 10) { setError("النبذة قصيرة جدًا. اكتب 10 أحرف على الأقل عن نفسك والخدمات التي تقدمها."); setStep(1); return; }
    setBusy(true);
    try {
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
      setSubmitted(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "حدث خطأ غير متوقع.");
    } finally { setBusy(false); setProgress(""); }
  }

  if (submitted) return <section role="status" aria-live="polite" className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl font-black text-emerald-700">✓</div><h2 className="mt-4 text-xl font-black text-emerald-900">تم إرسال طلبك بنجاح</h2><p className="mt-3 leading-8 text-emerald-800">وصلت بياناتك ونماذج أعمالك إلى الإدارة للمراجعة. لن يتم تفعيل حساب مقدم الخدمة إلا بعد موافقة الأدمن. لا تحتاج إلى إرسال الطلب مرة أخرى.</p><p className="mt-3 text-sm font-bold text-emerald-700">يمكنك العودة إلى الرئيسية بأمان.</p></section>;

  return <form id="provider-verification-form" onSubmit={submit} onBlur={handleBlur} noValidate className="mt-6">
    <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
      <p className="font-black text-orange-900">استكمال طلب الانضمام كمقدم خدمة</p>
      <p className="mt-1 text-sm leading-7 text-orange-800">كل حساب مقدم خدمة يخضع لمراجعة الإدارة قبل التفعيل. نستخدم الرقم القومي لاستخراج تاريخ الميلاد فقط ولا نحفظ الرقم القومي الكامل.</p>
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
          <input name="nationalId" type="text" inputMode="numeric" autoComplete="off" required value={nationalId} onChange={event=>handleNationalId(event.target.value)} pattern="[23][0-9]{13}" maxLength={14} dir="ltr" className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-left tracking-widest" placeholder="اكتب الرقم القومي كاملًا"/>
          <span className="mt-1 block text-xs font-normal text-slate-500">لا يتم حفظ الرقم القومي الكامل. عند العودة للحساب، ستحتاج لإعادة إدخاله فقط لتأكيد تاريخ الميلاد.</span>
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
          <textarea name="bio" required minLength={10} maxLength={1500} rows={5} className="mt-2 w-full rounded-xl border border-slate-200 p-3" placeholder="عرّفنا بنفسك ومهاراتك وطريقة عملك"/>
          <span className="mt-1 block text-xs font-normal text-slate-500">اكتب 10 أحرف على الأقل عن خبرتك والخدمات التي تقدمها.</span>
        </label>
        <label className="block text-sm font-bold text-slate-700">نماذج من أعمالك (مطلوب من 1 إلى 5 ملفات)
          <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" multiple onChange={handleFiles} disabled={uploading || portfolioPaths.length >= 5} className="mt-2 block w-full rounded-xl border border-slate-200 p-3 text-sm"/>
          <span className="mt-1 block text-xs font-normal text-slate-500">صور JPG/PNG/WEBP حتى 8 MB، أو فيديو MP4/WEBM/MOV حتى 40 MB. يتم رفع الملفات وحفظها فور اختيارها.</span>
        </label>
        {files.length>0&&<p className="text-sm font-bold text-slate-600">تم اختيار {files.length} ملف في هذه الجلسة</p>}
        {portfolioPaths.length>0&&<p className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">نماذج أعمال محفوظة: {portfolioPaths.length} من 5 — ستظل موجودة عند العودة لحسابك.</p>}
      </fieldset>
    </div>
    {draftStatus&&<p role="status" aria-live="polite" className="mt-3 rounded-xl bg-blue-50 p-3 text-sm font-bold text-blue-800">{draftStatus}</p>}
    {error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
    {progress&&<p role="status" aria-live="polite" className="mt-4 rounded-xl bg-blue-50 p-3 text-sm font-bold text-blue-700">{progress}</p>}
    <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
      <button type="button" disabled={step===0||busy||uploading} onClick={()=>{setError("");setStep(value=>Math.max(0,value-1));}} className="min-h-12 rounded-xl border border-slate-200 px-6 py-3 font-bold text-slate-700 disabled:opacity-40">رجوع</button>
      {step===0?<button type="button" onClick={nextStep} className="min-h-12 rounded-xl bg-orange-500 px-7 py-3 font-black text-white">التالي</button>:<button type="submit" disabled={busy||uploading||portfolioPaths.length<1} className="min-h-12 rounded-xl bg-orange-500 px-7 py-3 font-black text-white disabled:opacity-50">{busy?"جاري الإرسال...":"إرسال للمراجعة"}</button>}
    </div>
  </form>;
}
