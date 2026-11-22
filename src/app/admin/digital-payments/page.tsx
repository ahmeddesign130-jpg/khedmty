import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createStorageDownload } from "@/lib/storage";
import DigitalPaymentReviewForm from "./DigitalPaymentReviewForm";
export const dynamic="force-dynamic";
export default async function AdminDigitalPaymentsPage(){
 const admin=await getCurrentUser();if(!admin)redirect("/login");if(admin.role!=="SUPER_ADMIN")redirect("/account");
 const purchases=await prisma.digitalPurchase.findMany({where:{status:"PAYMENT_REVIEW"},include:{product:{select:{title:true}},buyer:{select:{displayName:true,email:true}},seller:{select:{displayName:true}},},orderBy:{createdAt:"asc"}});
 const items=await Promise.all(purchases.map(async p=>({p,receipt:p.receiptPath?await createStorageDownload("payment-receipts",p.receiptPath):null})));
 return <main dir="rtl" className="min-h-screen bg-slate-50 p-5 md:p-9"><section className="mx-auto max-w-5xl"><Link href="/admin" className="font-bold text-orange-600">← لوحة الإدارة</Link><h1 className="mt-5 text-3xl font-black">مدفوعات المتاجر الرقمية</h1><p className="mt-2 text-slate-600">راجع الإيصال وتأكد بنفسك من وصول المبلغ كاملًا قبل الاعتماد.</p><div className="mt-6 space-y-4">{items.map(({p,receipt})=><article key={p.id} className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="font-black">{p.product.title}</h2><p className="mt-2 text-sm text-slate-500">رقم الشراء: {p.purchaseNo}</p><p className="mt-2 text-sm">العميل: {p.buyer.displayName} ({p.buyer.email}) · البائع: {p.seller.displayName}</p><div className="mt-3 grid gap-2 rounded-xl bg-slate-50 p-4 sm:grid-cols-3"><p>الإجمالي: <strong>{p.total.toLocaleString("en-US")} EG</strong></p><p>عمولة المنصة: <strong>{p.commission.toLocaleString("en-US")} EG</strong></p><p>صافي البائع: <strong>{p.sellerNet.toLocaleString("en-US")} EG</strong></p></div>{receipt?<a href={receipt} target="_blank" rel="noreferrer" className="mt-4 inline-flex font-bold text-orange-600">فتح إيصال التحويل ←</a>:<p className="mt-3 text-sm font-bold text-red-600">تعذر إنشاء رابط الإيصال. راجع إعدادات التخزين.</p>}<DigitalPaymentReviewForm id={p.id}/></article>)}{items.length===0&&<p className="rounded-xl bg-white p-8 text-center text-slate-500">لا توجد مدفوعات رقمية قيد المراجعة.</p>}</div></section></main>;
}
