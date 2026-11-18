"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
type PaymentMethod = "INSTAPAY" | "E_AND_MONEY" | "ETISALAT_CASH";
export default function PaymentSubmissionForm({orderId,amount,methods}:{orderId:string;amount:number;methods:{value:PaymentMethod;label:string}[]}){
 const router=useRouter();const [file,setFile]=useState<File|null>(null);const [method,setMethod]=useState("");const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setError("");if(!file){setError("اختَر صورة إيصال التحويل أولاً.");return;}if(!method){setError("اختر وسيلة الدفع.");return;}setBusy(true);
  try{
   const signResponse=await fetch("/api/uploads/sign",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind:"receipt",name:file.name,mimeType:file.type,size:file.size})});
   const sign=await signResponse.json();if(!signResponse.ok)throw new Error(sign.message||"تعذر تجهيز رفع الإيصال.");
   const upload=await fetch(sign.uploadUrl,{method:"PUT",headers:{"Content-Type":file.type},body:file});if(!upload.ok)throw new Error("فشل رفع صورة الإيصال.");
   const response=await fetch("/api/payments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId,method,receiptUrl:sign.objectPath,amount})});
   const data=await response.json();if(!response.ok)throw new Error(data.message||"تعذر إرسال إثبات الدفع.");
   router.push(`/orders/${orderId}?payment=submitted`);router.refresh();
  }catch(err){setError(err instanceof Error?err.message:"حدث خطأ غير متوقع.");}finally{setBusy(false);}
 }
 return <form onSubmit={submit} className="mt-7 space-y-5">
 <label className="block text-sm font-bold text-slate-700">وسيلة الدفع<select value={method} onChange={e=>setMethod(e.target.value)} required className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3"><option value="">اختر وسيلة الدفع</option>{methods.map((item)=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
 <label className="block text-sm font-bold text-slate-700">صورة إيصال التحويل<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)} required className="mt-2 block w-full rounded-xl border border-slate-200 p-3 text-sm"/></label>
 <p className="text-xs leading-6 text-slate-500">صورة JPG أو PNG أو WEBP، بحد أقصى 8 MB. الصورة محفوظة بشكل خاص ولا يمكن فتحها إلا من لوحة الإدارة.</p>
 {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
 <button disabled={busy} className="w-full rounded-xl bg-orange-500 p-4 font-black text-white disabled:opacity-50">{busy?"جاري رفع الإيصال وإرساله...":"إرسال إثبات الدفع للمراجعة"}</button></form>;
}
