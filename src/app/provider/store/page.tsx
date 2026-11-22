import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import StoreSetupForm from "./StoreSetupForm";
import ProductCreateForm from "./ProductCreateForm";
export const dynamic="force-dynamic";
const labels:Record<string,string>={PENDING_REVIEW:"قيد مراجعة الإدارة",APPROVED:"متاح للبيع",REJECTED:"مرفوض",PAUSED:"متوقف"};
export default async function ProviderStorePage(){
 const user=await getCurrentUser();if(!user)redirect("/login");if(user.role!=="PROVIDER")redirect("/account");if(user.status!=="ACTIVE")redirect("/pending");
 const store=await prisma.store.findUnique({where:{ownerId:user.id},include:{products:{orderBy:{createdAt:"desc"},include:{purchases:{where:{status:"PAID"},select:{sellerNet:true}}}}}});
 const sales=store?.products.flatMap(p=>p.purchases)??[];const earnings=sales.reduce((n,p)=>n+p.sellerNet,0);
 return <main dir="rtl" className="min-h-screen bg-slate-50 p-5 md:p-9"><section className="mx-auto max-w-5xl"><Link href="/provider" className="font-bold text-orange-600">← لوحة مقدم الخدمة</Link><h1 className="mt-5 text-3xl font-black text-[#14213d]">متجري الرقمي</h1><p className="mt-2 text-slate-600">اعرض ملفاتك الرقمية للبيع وتابع المنتجات والمبيعات من مكان واحد.</p>
 {store&&<div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-white p-5"><p className="text-sm text-slate-500">المنتجات</p><p className="mt-2 text-2xl font-black">{store.products.length.toLocaleString("en-US")}</p></div><div className="rounded-2xl bg-white p-5"><p className="text-sm text-slate-500">المبيعات المعتمدة</p><p className="mt-2 text-2xl font-black">{sales.length.toLocaleString("en-US")}</p></div><div className="rounded-2xl bg-white p-5"><p className="text-sm text-slate-500">صافي مستحقاتك</p><p className="mt-2 text-2xl font-black">{earnings.toLocaleString("en-US")} EG</p></div></div>}
 <StoreSetupForm initialName={store?.name} initialDescription={store?.description}/>
 {store&&<><ProductCreateForm/><div className="mt-8 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black">منتجات المتجر</h2><Link href={`/stores/${store.slug}`} className="font-bold text-orange-600">معاينة المتجر ←</Link></div><div className="mt-4 space-y-3">{store.products.map(p=><article key={p.id} className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex flex-wrap justify-between gap-2"><strong>{p.title}</strong><span className="text-sm font-bold text-orange-600">{labels[p.status]}</span></div><p className="mt-2 text-sm text-slate-500">{p.description}</p><p className="mt-3 font-black">{p.price.toLocaleString("en-US")} EG صافي السعر</p>{p.reviewNote&&<p className="mt-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">ملاحظة الإدارة: {p.reviewNote}</p>}</article>)}</div></>}
 </section></main>;
}
