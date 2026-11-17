import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function submitPayment(formData:FormData) {
 "use server";
 const user=await getCurrentUser(); if(!user||user.role!=="CUSTOMER"||user.status!=="ACTIVE") redirect("/login");
 const orderId=String(formData.get("orderId")||"");
 const method=String(formData.get("method")||"");
 const receiptUrl=String(formData.get("receiptUrl")||"").trim();
 if(!["INSTAPAY","E_AND_MONEY","ETISALAT_CASH","OTHER"].includes(method)) redirect(`/orders/${orderId}/payment?error=method`);
 try { const parsed=new URL(receiptUrl); if(!["https:","http:"].includes(parsed.protocol)) throw new Error("invalid"); }
 catch { redirect(`/orders/${orderId}/payment?error=receipt`); }
 const order=await prisma.order.findFirst({where:{id:orderId,customerId:user.id},include:{payments:true}});
 if(!order) notFound();
 if(order.status!=="PENDING_PAYMENT"||order.payments.some(p=>p.status==="PENDING_REVIEW")) redirect(`/orders/${orderId}`);
 await prisma.$transaction(async tx=>{
  const payment=await tx.payment.create({data:{orderId,method,receiptUrl,amount:order.total,status:"PENDING_REVIEW"}});
  await tx.order.update({where:{id:orderId},data:{status:"PAYMENT_REVIEW"}});
  await tx.auditLog.create({data:{actorId:user.id,action:"PAYMENT_SUBMITTED",targetId:payment.id,details:`تم إرسال إثبات الدفع للطلب ${order.orderNo} بمبلغ ${order.total}`}});
 });
 revalidatePath(`/orders/${orderId}`); revalidatePath("/admin/payments");
 redirect(`/orders/${orderId}?payment=submitted`);
}

export default async function PaymentPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{error?:string}>}) {
 const user=await getCurrentUser(); if(!user) redirect("/login"); if(user.role!=="CUSTOMER"||user.status!=="ACTIVE") redirect("/account");
 const {id}=await params; const query=await searchParams;
 const order=await prisma.order.findUnique({where:{id},include:{payments:{orderBy:{createdAt:"desc"}}}});
 if(!order||order.customerId!==user.id) notFound();
 if(order.status!=="PENDING_PAYMENT") redirect(`/orders/${order.id}`);
 return <main dir="rtl" className="min-h-screen bg-[#f5f6f8]"><header className="bg-[#14213d] px-5 py-5 text-white"><div className="mx-auto flex max-w-3xl items-center justify-between"><Link href="/" className="text-2xl font-black text-orange-400">خِدمتي</Link><Link href={`/orders/${order.id}`} className="font-bold">تفاصيل الطلب</Link></div></header>
 <section className="mx-auto max-w-3xl px-5 py-10"><div className="rounded-3xl bg-white p-6 shadow-sm md:p-9">
 <h1 className="text-2xl font-black text-[#14213d]">إتمام الدفع اليدوي</h1>
 <p className="mt-3 leading-7 text-slate-600">حوّل المبلغ باستخدام بيانات الدفع الرسمية التي حصلت عليها من إدارة خِدمتي، ثم أرسل رابط صورة الإيصال. لن يتم اعتماد الطلب قبل مراجعة الإدارة.</p>
 <div className="mt-7 rounded-2xl bg-[#14213d] p-6 text-white"><p className="text-sm text-slate-300">رقم الطلب</p><p className="mt-2 text-xl font-black">{order.orderNo}</p><p className="mt-5 text-sm text-slate-300">المبلغ المطلوب</p><p className="mt-2 text-3xl font-black text-orange-400">{order.total.toLocaleString("en-US")} EG</p></div>
 {query.error&&<p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">{query.error==="receipt"?"أدخل رابطًا صحيحًا لصورة الإيصال.":"اختر وسيلة دفع صحيحة."}</p>}
 <form action={submitPayment} className="mt-7 space-y-5"><input type="hidden" name="orderId" value={order.id}/>
 <label className="block text-sm font-bold text-slate-700">وسيلة الدفع<select name="method" required defaultValue="" className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3"><option value="" disabled>اختر وسيلة الدفع</option><option value="INSTAPAY">InstaPay</option><option value="E_AND_MONEY">e& money</option><option value="ETISALAT_CASH">Etisalat Cash</option><option value="OTHER">وسيلة أخرى</option></select></label>
 <label className="block text-sm font-bold text-slate-700">رابط صورة إيصال التحويل<input name="receiptUrl" type="url" required placeholder="https://..." dir="ltr" className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-left"/></label>
 <p className="rounded-xl bg-orange-50 p-4 text-sm leading-7 text-orange-900">لا ترفع بيانات بطاقة أو كلمة مرور. ارفع صورة الإيصال إلى خدمة ملفات موثوقة ثم ضع رابط الصورة هنا. لا توجد خدمة رفع ملفات مدمجة حتى الآن.</p>
 <button className="w-full rounded-xl bg-orange-500 p-4 font-black text-white">إرسال إثبات الدفع للمراجعة</button></form>
 </div></section></main>;
}
