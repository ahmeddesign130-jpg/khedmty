"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function DigitalPaymentReviewForm({ id }: { id: string }) {
  const router=useRouter(); const [note,setNote]=useState(""); const [reference,setReference]=useState(""); const [date,setDate]=useState(""); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  async function review(status:"PAID"|"REJECTED") {
    if(status==="REJECTED"&&!note.trim()){setError("اكتب سبب الرفض.");return;}
    if(!window.confirm(status==="PAID"?"هل تحققت بنفسك من وصول المبلغ ومطابقته؟ بعد التأكيد سيُفتح الملف تلقائيًا للعميل.":"تأكيد رفض الإيصال؟"))return;
    setBusy(true);setError("");
    try{const r=await fetch(`/api/digital-purchases/${id}/review`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status,reviewNote:note,transferReference:reference,transferDate:date?new Date(date).toISOString():undefined})});const d=await r.json();if(!r.ok)throw new Error(d.message||"تعذرت مراجعة الدفع.");router.refresh();}
    catch(e){setError(e instanceof Error?e.message:"حدث خطأ.");}finally{setBusy(false);}
  }
  return <div className="mt-4 space-y-2"><input value={reference} onChange={e=>setReference(e.target.value)} maxLength={120} placeholder="الرقم المرجعي بعد التحقق" className="w-full rounded-xl border p-3 text-sm"/><input type="datetime-local" value={date} onChange={e=>setDate(e.target.value)} className="w-full rounded-xl border p-3 text-sm"/><textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={1000} rows={2} placeholder="ملاحظة الإدارة / سبب الرفض" className="w-full rounded-xl border p-3 text-sm"/>{error&&<p role="alert" className="text-sm font-bold text-red-600">{error}</p>}<div className="flex flex-wrap gap-2"><button disabled={busy} onClick={()=>review("PAID")} className="rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white">تأكيد الدفع وفتح الملف</button><button disabled={busy} onClick={()=>review("REJECTED")} className="rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white">رفض الإيصال</button></div></div>;
}
