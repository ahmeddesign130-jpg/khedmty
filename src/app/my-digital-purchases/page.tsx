import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export const dynamic="force-dynamic";
const labels:Record<string,string>={PENDING_PAYMENT:"في انتظار الدفع",PAYMENT_REVIEW:"قيد مراجعة الدفع",PAID:"تم الدفع - الملف متاح",REJECTED:"مرفوض - يمكنك إعادة إرسال الإيصال"};
export default async function MyDigitalPurchasesPage(){
 const user=await getCurrentUser();if(!user)redirect("/login");if(user.role!=="CUSTOMER")redirect("/account");
 const purchases=await prisma.digitalPurchase.findMany({where:{buyerId:user.id},include:{product:{select:{title:true,fileName:true},},seller:{select:{displayName:true}}},orderBy:{createdAt:"desc"}});
 return <main dir="rtl" className="min-h-screen bg-slate-50 px-5 py-10"><section className="mx-auto max-w-4xl"><Link href="/stores" className="font-bold text-orange-600">← المتاجر الرقمية</Link><h1 className="mt-5 text-3xl font-black text-[#14213d]">مشترياتي الرقمية</h1><div className="mt-6 space-y-3">{purchases.map(p=><article key={p.id} className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex flex-wrap justify-between gap-2"><h2 className="font-black">{p.product.title}</h2><span className="text-sm font-bold text-orange-600">{labels[p.status]}</span></div><p className="mt-2 text-xs text-slate-500">رقم الشراء: {p.purchaseNo} · البائع: {p.seller.displayName}</p><p className="mt-2 font-bold">{p.total.toLocaleString("en-US")} EG</p>{p.status==="PAID"?<a href={`/api/digital-purchases/${p.id}/download`} className="mt-4 inline-flex rounded-xl bg-orange-500 px-5 py-3 font-black text-white">تحميل الملف الآن</a>:p.status==="REJECTED"?<Link href={`/digital-purchases/${p.id}/payment`} className="mt-4 inline-flex rounded-xl border border-orange-300 px-5 py-3 font-bold text-orange-700">إعادة إرسال إثبات الدفع</Link>:null}</article>)}{purchases.length===0&&<p className="rounded-2xl bg-white p-8 text-center text-slate-500">لم تشترِ أي منتجات رقمية حتى الآن.</p>}</div></section></main>;
}
