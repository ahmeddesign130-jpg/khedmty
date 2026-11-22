"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function DigitalProductReviewForm({ id }: { id: string }) {
  const router = useRouter(); const [note,setNote] = useState(""); const [busy,setBusy] = useState(false); const [error,setError] = useState("");
  async function review(status: "APPROVED"|"REJECTED"|"PAUSED") {
    if (status === "REJECTED" && !note.trim()) { setError("اكتب سبب الرفض أولًا."); return; }
    if (!window.confirm(status === "APPROVED" ? "اعتماد المنتج وإظهاره للعملاء؟" : status === "PAUSED" ? "إيقاف عرض المنتج؟" : "تأكيد رفض المنتج؟")) return;
    setBusy(true); setError("");
    try { const r=await fetch(`/api/store/products/${id}/review`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status,reviewNote:note})}); const d=await r.json(); if(!r.ok) throw new Error(d.message||"تعذر تحديث المنتج."); router.refresh(); }
    catch(e){setError(e instanceof Error?e.message:"حدث خطأ.");} finally{setBusy(false);}
  }
  return <div className="mt-4 space-y-2">
    <textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={1000} rows={2} placeholder="ملاحظة الإدارة أو سبب الرفض" className="w-full rounded-xl border p-3 text-sm"/>
    {error&&<p role="alert" className="text-sm font-bold text-red-600">{error}</p>}
    <div className="flex flex-wrap gap-2"><button disabled={busy} onClick={()=>review("APPROVED")} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white">اعتماد</button><button disabled={busy} onClick={()=>review("REJECTED")} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white">رفض</button><button disabled={busy} onClick={()=>review("PAUSED")} className="rounded-lg border px-4 py-2 text-sm font-bold">إيقاف</button></div>
  </div>;
}
