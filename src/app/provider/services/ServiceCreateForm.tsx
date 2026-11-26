"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { SERVICE_CATEGORIES, SERVICE_CATEGORY_NAMES } from "@/lib/service-categories";

type UploadedMedia = { url: string; type: "image" | "video" };
export default function ServiceCreateForm() {
 const router=useRouter();
 const [files,setFiles]=useState<File[]>([]);
 const [category,setCategory]=useState<string>(SERVICE_CATEGORY_NAMES[0]);
 const [requirements,setRequirements]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [progress,setProgress]=useState("");
 const subcategories=(SERVICE_CATEGORIES as Record<string,readonly string[]>)[category]||[];
 async function upload(file:File):Promise<UploadedMedia>{
  const signedResponse=await fetch("/api/uploads/sign",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind:"service",name:file.name,mimeType:file.type,size:file.size})});
  const signed=await signedResponse.json();
  if(!signedResponse.ok)throw new Error(signed.message||"تعذر تجهيز رفع الملف.");
  const uploaded=await fetch(signed.uploadUrl,{method:"PUT",headers:{"Content-Type":file.type},body:file});
  if(!uploaded.ok)throw new Error("فشل رفع الملف إلى التخزين.");
  return {url:signed.publicUrl,type:file.type.startsWith("video/")?"video":"image"};
 }
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setError("");
  if(files.length>8){setError("يمكن رفع 8 ملفات كحد أقصى.");return;}
  setBusy(true);
  try{
   const formElement=event.currentTarget;const form=new FormData(formElement);const media:UploadedMedia[]=[];
   for(let i=0;i<files.length;i++){setProgress(`جاري رفع الملف ${i+1} من ${files.length}...`);media.push(await upload(files[i]));}
   setProgress("جاري إرسال الخدمة للمراجعة...");
   const response=await fetch("/api/services",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
    title:String(form.get("title")||""),description:String(form.get("description")||""),category,
    subcategory:String(form.get("subcategory")||""),requirements:requirements.split("\n").map(x=>x.trim()).filter(Boolean),
    price:Number(form.get("price")),mediaUrls:media.map(x=>x.url)
   })});
   const data=await response.json();if(!response.ok)throw new Error(data.message||"تعذر إنشاء الخدمة.");
   formElement.reset();setFiles([]);setRequirements("");setProgress("تم إرسال الخدمة للمراجعة.");router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"حدث خطأ غير متوقع.");}
  finally{setBusy(false);}
 }
 return <form aria-labelledby="new-service-heading" onSubmit={submit} className="mt-7 space-y-4 rounded-2xl bg-white p-6 shadow-sm">
  <h2 id="new-service-heading" className="text-xl font-black">إضافة خدمة جديدة</h2>
  <label className="block text-sm font-bold">عنوان الخدمة<input name="title" required minLength={5} maxLength={120} className="mt-2 w-full rounded-xl border p-3"/></label>
  <label className="block text-sm font-bold">المجال الرئيسي<select value={category} onChange={e=>setCategory(e.target.value)} className="mt-2 w-full rounded-xl border bg-white p-3">{SERVICE_CATEGORY_NAMES.map(name=><option key={name} value={name}>{name}</option>)}</select></label>
  <label className="block text-sm font-bold">التخصص<select name="subcategory" required className="mt-2 w-full rounded-xl border bg-white p-3">{subcategories.map(name=><option key={name} value={name}>{name}</option>)}</select></label>
  <label className="block text-sm font-bold">وصف الخدمة<textarea name="description" required minLength={20} maxLength={5000} rows={5} className="mt-2 w-full rounded-xl border p-3"/></label>
  <label className="block text-sm font-bold">المتطلبات التي يحتاجها مقدم الخدمة من العميل<textarea value={requirements} onChange={e=>setRequirements(e.target.value)} rows={4} maxLength={1800} placeholder={"كل متطلب في سطر مستقل، مثال:\nالنصوص المطلوبة للموقع\nالشعار والألوان\nصور المنتجات"} className="mt-2 w-full rounded-xl border p-3"/></label>
  <p className="text-xs leading-6 text-slate-500">اكتب ما يحتاجه العميل لتجهيز الطلب. ستظهر هذه المتطلبات في صفحة الخدمة قبل الشراء.</p>
  <label className="block text-sm font-bold">السعر المقترح من مقدم الخدمة (EG)<input name="price" type="number" min="1" step="1" required className="mt-2 w-full rounded-xl border p-3"/></label>
  <label htmlFor="service-media" className="block text-sm font-bold">صور وفيديوهات الخدمة</label><input id="service-media" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" multiple onChange={e=>setFiles(Array.from(e.target.files||[]))} className="mt-2 block w-full rounded-xl border p-3 text-sm"/>
  <p className="text-xs leading-6 text-slate-500">حتى 8 ملفات. الصور بحد أقصى 8 MB والفيديو 40 MB للملف. الصيغ: JPG وPNG وWEBP وMP4 وWEBM وMOV.</p>
  {files.length>0&&<p className="text-sm font-bold text-slate-600">تم اختيار {files.length} ملف</p>}
  {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
  {progress&&<p role="status" aria-live="polite" className="rounded-xl bg-blue-50 p-3 text-sm font-bold text-blue-700">{progress}</p>}
  <button type="submit" disabled={busy||files.length>8} className="w-full rounded-xl bg-orange-500 p-4 font-black text-white disabled:opacity-50">{busy?"يرجى الانتظار...":"إرسال الخدمة للمراجعة"}</button>
  <p className="text-xs leading-6 text-slate-500">هذا سعر مقترح للمراجعة فقط؛ الأدمن يحدد السعر النهائي للعميل عند اعتماد الخدمة.</p>
 </form>;
}