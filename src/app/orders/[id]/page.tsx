import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const statusLabels:Record<string,string>={PENDING_PAYMENT:"في انتظار الدفع",PAYMENT_REVIEW:"الدفع قيد المراجعة",PAID:"تم تأكيد الدفع",IN_PROGRESS:"جاري تنفيذ الطلب",DELIVERED:"تم تسليم الخدمة",REVISION_REQUESTED:"مطلوب تعديل",COMPLETED:"مكتمل",CANCELLED:"ملغي",REJECTED:"مرفوض"};
const paymentLabels:Record<string,string>={PENDING_REVIEW:"قيد مراجعة الإدارة",APPROVED:"تم اعتماد الدفع",REJECTED:"تم رفض الدفع"};

async function updateOrder(formData:FormData) {
 "use server";
 const user=await getCurrentUser(); if(!user) redirect("/login");
 const id=String(formData.get("id")||""); const next=String(formData.get("status")||"");
 if(!["CANCELLED","REVISION_REQUESTED","COMPLETED"].includes(next)) return;
 const order=await prisma.order.findUnique({where:{id}});
 if(!order||order.customerId!==user.id) redirect("/account");
 const allowed=order.status==="PENDING_PAYMENT"&&next==="CANCELLED"||order.status==="DELIVERED"&&next==="COMPLETED";
 if(!allowed) return;
 try {
  await prisma.$transaction(async (tx) => {
   const updated = await tx.order.updateMany({
    where: { id, customerId: user.id, status: order.status },
    data: { status: next as "CANCELLED" | "REVISION_REQUESTED" | "COMPLETED" },
   });
   if (updated.count !== 1) throw new Error("ORDER_STATUS_CONFLICT");
   await tx.auditLog.create({
    data: { actorId: user.id, action: "ORDER_STATUS_UPDATED", targetId: id, details: `تغيير حالة الطلب إلى ${next}` },
   });
  });
 } catch (error) {
  if (error instanceof Error && error.message === "ORDER_STATUS_CONFLICT") return;
  throw error;
 }
 revalidatePath("/orders"); revalidatePath(`/orders/${id}`); revalidatePath("/provider/orders"); revalidatePath("/admin/orders");
}

export default async function OrderDetailsPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{payment?:string}>}) {
 const user=await getCurrentUser(); if(!user) redirect("/login");
 const {id}=await params; const query=await searchParams;
 const order=await prisma.order.findUnique({where:{id},include:{customer:{select:{id:true,displayName:true}},provider:{select:{id:true,displayName:true}},payments:{orderBy:{createdAt:"desc"}},deliveryFiles:{orderBy:{createdAt:"asc"}}}});
 if(!order) notFound();
 const isAdmin=user.role==="SUPER_ADMIN",isCustomer=order.customerId===user.id,isProvider=order.providerId===user.id;
 if(!isAdmin&&!isCustomer&&!isProvider) redirect("/account");
 const service=await prisma.service.findUnique({where:{id:order.serviceId},select:{title:true,serviceNo:true}});
 const latestPayment=order.payments[0];
 return <main dir="rtl" className="min-h-screen bg-[#f5f6f8]"><header className="bg-[#14213d] px-5 py-5 text-white"><div className="mx-auto flex max-w-4xl items-center justify-between"><Link href="/" className="text-2xl font-black text-orange-400">خِدمتي</Link><Link href={isProvider?"/provider/orders":isAdmin?"/admin/orders":"/orders"} className="font-bold">العودة للطلبات</Link></div></header>
 <section className="mx-auto max-w-4xl px-5 py-10"><div className="rounded-3xl bg-white p-6 shadow-sm md:p-9">
 {query.payment==="submitted"&&<p className="mb-5 rounded-xl bg-green-50 p-4 font-bold text-green-700">تم إرسال إثبات الدفع. الطلب الآن قيد مراجعة الإدارة.</p>}
 <div className="flex flex-wrap items-center justify-between gap-4"><h1 className="text-2xl font-black text-[#14213d]">تفاصيل الطلب</h1><span className="rounded-xl bg-orange-50 px-4 py-2 text-sm font-bold text-orange-700">{statusLabels[order.status]||order.status}</span></div>
 <div className="mt-7 rounded-2xl bg-slate-50 p-5"><p className="text-sm text-slate-500">رقم الطلب</p><p className="mt-2 text-xl font-black text-[#14213d]">{order.orderNo}</p></div>
 <div className="mt-6 grid gap-5 sm:grid-cols-2"><div><p className="text-sm text-slate-500">الخدمة</p><p className="mt-1 font-bold">{service?.title||"الخدمة"}</p>{isAdmin&&service&&<p className="mt-1 text-xs text-slate-500">رقم الخدمة: {service.serviceNo}</p>}</div><div><p className="text-sm text-slate-500">العميل</p><p className="mt-1 font-bold">{order.customer.displayName}</p></div><div><p className="text-sm text-slate-500">مقدم الخدمة</p><p className="mt-1 font-bold">{order.provider.displayName}</p></div>{isAdmin&&<div><p className="text-sm text-slate-500">وسيلة تواصل العميل (للإدارة فقط)</p><p className="mt-1 font-bold" dir="auto">{order.customerContact || "غير محددة"}</p></div>}</div>
 <div className="mt-7 rounded-2xl bg-[#14213d] p-6 text-white"><h2 className="text-lg font-black">ملخص المبلغ</h2><div className="mt-5 space-y-4 text-sm">{isAdmin ? <><div className="flex justify-between gap-3"><span className="text-slate-300">السعر النهائي للعميل</span><span className="font-bold">{order.total.toLocaleString("en-US")} EG</span></div><div className="flex justify-between gap-3"><span className="text-slate-300">حصة خِدمتي ({order.commissionRate}%)</span><span className="font-bold">{order.commission.toLocaleString("en-US")} EG</span></div><div className="flex justify-between gap-3"><span className="text-slate-300">صافي مقدم الخدمة</span><span className="font-bold">{order.providerNet.toLocaleString("en-US")} EG</span></div></> : isProvider ? <div className="flex justify-between gap-3"><span className="text-slate-300">صافي مستحقاتك</span><span className="text-2xl font-black text-orange-400">{order.providerNet.toLocaleString("en-US")} EG</span></div> : null}{isCustomer && <div className="flex justify-between border-t border-white/20 pt-4"><span className="font-bold">السعر النهائي</span><span className="text-2xl font-black text-orange-400">{order.total.toLocaleString("en-US")} EG</span></div>}</div></div>
 {latestPayment&&<div className="mt-6 rounded-2xl border border-slate-200 p-5"><h2 className="font-black text-[#14213d]">آخر عملية دفع</h2><p className="mt-3 text-sm text-slate-600">الحالة: {paymentLabels[latestPayment.status]||latestPayment.status}</p><p className="mt-2 text-sm text-slate-600">المبلغ: {latestPayment.amount.toLocaleString("en-US")} EG</p>{latestPayment.reviewNote&&<p className="mt-3 rounded-lg bg-orange-50 p-3 text-sm">{latestPayment.reviewNote}</p>}</div>}
 {order.deliveryFiles.length>0&&<section className="mt-6 rounded-2xl border border-slate-200 p-5"><h2 className="font-black text-[#14213d]">ملفات تسليم الطلب</h2><p className="mt-2 text-sm text-slate-500">الملفات مرتبطة برقم الطلب ولا يمكن الوصول إليها إلا من أطراف الطلب والإدارة.</p><div className="mt-4 space-y-3">{order.deliveryFiles.map(file=><div key={file.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4"><div><p className="font-bold">{file.fileName}</p><p className="mt-1 text-xs text-slate-500">{Math.max(1,Math.ceil(file.sizeBytes/1024))} KB</p></div><a href={`/api/orders/${order.id}/delivery/${file.id}`} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-white">تحميل الملف</a></div>)}</div></section>}
 {isCustomer&&order.status==="PENDING_PAYMENT"&&<Link href={`/orders/${order.id}/payment`} className="mt-7 block rounded-xl bg-orange-500 px-6 py-4 text-center font-black text-white">الانتقال إلى الدفع</Link>}
 {isCustomer&&order.status==="PENDING_PAYMENT"&&<form action={updateOrder} className="mt-4"><input type="hidden" name="id" value={order.id}/><button name="status" value="CANCELLED" className="rounded-xl border border-red-200 px-5 py-3 font-bold text-red-600">إلغاء الطلب</button></form>}
 {isCustomer&&order.status==="DELIVERED"&&<form action={updateOrder} className="mt-6"><input type="hidden" name="id" value={order.id}/><button name="status" value="COMPLETED" className="rounded-xl bg-green-600 px-5 py-3 font-bold text-white">تأكيد استلام الشغل</button></form>}
 {isProvider&&<p className="mt-7 rounded-xl bg-blue-50 p-4 text-sm leading-7 text-blue-800">بيانات تواصل العميل مخفية عنك. بعد تأكيد الدفع يمكنك تنفيذ العمل وإرساله للإدارة لمراجعته وتسليمه للعميل.</p>}
 </div></section></main>;
}
