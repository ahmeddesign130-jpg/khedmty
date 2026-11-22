import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DigitalPaymentForm from "./DigitalPaymentForm";
export const dynamic="force-dynamic";
export default async function DigitalPaymentPage({params}:{params:Promise<{id:string}>}){
 const user=await getCurrentUser();if(!user)redirect("/login");if(user.role!=="CUSTOMER")redirect("/account");const {id}=await params;
 const purchase=await prisma.digitalPurchase.findUnique({where:{id},include:{product:true}});if(!purchase||purchase.buyerId!==user.id)notFound();
 if(purchase.status==="PAID")redirect("/my-digital-purchases");if(purchase.status==="PAYMENT_REVIEW")redirect("/my-digital-purchases");
 const wallet=(process.env.PAYMENT_WALLET_NUMBER||process.env.ETISALAT_CASH_NUMBER||"").trim();
 return <main dir="rtl" className="min-h-screen bg-slate-50 px-5 py-10"><section className="mx-auto max-w-2xl rounded-3xl bg-white p-6 shadow-sm md:p-9"><Link href="/stores" className="font-bold text-orange-600">← المتاجر الرقمية</Link><p className="mt-5 text-sm font-bold text-orange-600">رقم الشراء: {purchase.purchaseNo}</p><h1 className="mt-2 text-2xl font-black text-[#14213d]">إتمام شراء {purchase.product.title}</h1><p className="mt-5 text-sm text-slate-500">حوّل المبلغ الموضح إلى محفظة خِدمتي ثم ارفع صورة الإيصال.</p><div className="mt-5 rounded-2xl bg-[#14213d] p-5 text-white"><p className="text-sm text-slate-300">المبلغ المطلوب</p><p className="mt-2 text-3xl font-black text-orange-400">{purchase.total.toLocaleString("en-US")} EG</p><p className="mt-5 text-sm text-slate-300">رقم محفظة الاستقبال</p><p className="mt-2 text-xl font-black" dir="ltr">{wallet||"غير مفعّل حاليًا"}</p><p className="mt-3 text-xs text-slate-300">اسم صاحب المحفظة غير معروض. تأكد من الرقم قبل التحويل.</p></div>{wallet?<DigitalPaymentForm purchaseId={purchase.id} amount={purchase.total}/>:<p className="mt-5 rounded-xl bg-orange-50 p-4 text-sm font-bold text-orange-800">الدفع متوقف مؤقتًا حتى تضبط الإدارة رقم محفظة الاستقبال.</p>}</section></main>;
}
