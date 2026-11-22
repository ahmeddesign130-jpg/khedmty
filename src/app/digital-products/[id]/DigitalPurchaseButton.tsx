"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function DigitalPurchaseButton({productId}:{productId:string}){
 const router=useRouter();const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 async function buy(){setBusy(true);setError("");try{const r=await fetch("/api/digital-purchases",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({productId})});const d=await r.json();if(r.status===401){router.push("/login");return;}if(!r.ok)throw new Error(d.message||"تعذر بدء الشراء.");router.push(`/digital-purchases/${d.purchase.id}/payment`);}catch(e){setError(e instanceof Error?e.message:"حدث خطأ.");}finally{setBusy(false);}}
 return <div className="mt-6"><button onClick={buy} disabled={busy} className="w-full rounded-xl bg-orange-500 px-6 py-4 font-black text-white disabled:opacity-50">{busy?"جارٍ تجهيز الطلب...":"شراء المنتج الرقمي"}</button>{error&&<p role="alert" className="mt-3 text-sm font-bold text-red-600">{error}</p>}</div>;
}
