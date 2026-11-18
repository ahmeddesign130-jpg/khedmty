import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ServiceCreateForm from "./ServiceCreateForm";
export const dynamic="force-dynamic";
export default async function ProviderServicesPage(){
 const user=await getCurrentUser();
 if(!user)redirect("/login");
 if(user.role!=="PROVIDER")redirect("/account");
 if(user.status!=="ACTIVE")redirect("/pending");
 const services=await prisma.service.findMany({where:{providerId:user.id},orderBy:{createdAt:"desc"}});
 const status:Record<string,string>={DRAFT:"مسودة",PENDING_REVIEW:"قيد المراجعة",APPROVED:"معتمدة",REJECTED:"مرفوضة",PAUSED:"متوقفة"};
 return <main dir="rtl" className="min-h-screen bg-slate-50 p-5 md:p-9"><div className="mx-auto max-w-5xl">
 <Link href="/provider" className="font-bold text-orange-600">← لوحة مقدم الخدمة</Link>
 <h1 className="mt-5 text-3xl font-black text-slate-900">خدماتي</h1>
 <ServiceCreateForm/>
 <h2 className="mt-9 text-xl font-black">الخدمات المضافة ({services.length})</h2>
 <div className="mt-4 space-y-3">{services.map(s=><article key={s.id} className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex flex-wrap justify-between gap-2"><strong>{s.title}</strong><span className="text-sm font-bold text-orange-600">{status[s.status]}</span></div>{s.reviewNote&&<p className="mt-3 rounded-xl bg-red-50 p-3 text-sm leading-6 text-red-700">ملاحظة الإدارة: {s.reviewNote}</p>}<p className="mt-2 font-black">{s.price.toLocaleString("en-US")} EG</p>{s.mediaUrls.length>0&&<div className="mt-4 flex flex-wrap gap-3">{s.mediaUrls.map((url,i)=><a key={url} href={url} target="_blank" rel="noreferrer" className="text-sm font-bold text-orange-600">فتح الملف {i+1}</a>)}</div>}</article>)}</div>
 </div></main>;
}
