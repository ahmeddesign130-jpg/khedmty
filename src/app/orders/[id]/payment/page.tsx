import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PaymentSubmissionForm from "./PaymentSubmissionForm";
export const dynamic="force-dynamic";
export default async function PaymentPage({params}:{params:Promise<{id:string}>}){
 const user=await getCurrentUser();if(!user)redirect("/login");if(user.role!=="CUSTOMER"||user.status!=="ACTIVE")redirect("/account");
 const {id}=await params;const order=await prisma.order.findUnique({where:{id},include:{payments:{orderBy:{createdAt:"desc"}}}});
 if(!order||order.customerId!==user.id)notFound();if(order.status!=="PENDING_PAYMENT")redirect(`/orders/${order.id}`);
 return <main dir="rtl" className="min-h-screen bg-[#f5f6f8]"><header className="bg-[#14213d] px-5 py-5 text-white"><div className="mx-auto flex max-w-3xl items-center justify-between"><Link href="/" className="text-2xl font-black text-orange-400">خِدمتي</Link><Link href={`/orders/${order.id}`} className="font-bold">تفاصيل الطلب</Link></div></header>
 <section className="mx-auto max-w-3xl px-5 py-10"><div className="rounded-3xl bg-white p-6 shadow-sm md:p-9"><h1 className="text-2xl font-black text-[#14213d]">إتمام الدفع اليدوي</h1>
 <p className="mt-3 leading-7 text-slate-600">حوّل المبلغ باستخدام بيانات الدفع الرسمية التي حصلت عليها من إدارة خِدمتي، ثم ارفع صورة الإيصال. لن يتم اعتماد الطلب قبل مراجعة الإدارة والتحقق من وصول المبلغ.</p>
 <div className="mt-7 rounded-2xl bg-[#14213d] p-6 text-white"><p className="text-sm text-slate-300">رقم الطلب</p><p className="mt-2 text-xl font-black">{order.orderNo}</p><p className="mt-5 text-sm text-slate-300">المبلغ المطلوب</p><p className="mt-2 text-3xl font-black text-orange-400">{order.total.toLocaleString("en-US")} EG</p></div>
 <PaymentSubmissionForm orderId={order.id} amount={order.total}/></div></section></main>;
}
