import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
async function changeStatus(formData:FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user || user.role !== "PROVIDER" || user.status !== "ACTIVE") redirect("/login");
  const id = String(formData.get("id") || "");
  const next = String(formData.get("status") || "");
  if (!id || !["IN_PROGRESS","DELIVERED"].includes(next)) return;
  const order = await prisma.order.findFirst({where:{id,providerId:user.id}});
  if (!order) return;
  const allowed = order.status === "PAID" && next === "IN_PROGRESS" || order.status === "IN_PROGRESS" && next === "DELIVERED" || order.status === "REVISION_REQUESTED" && ["IN_PROGRESS","DELIVERED"].includes(next);
  if (!allowed) return;
  await prisma.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: { id, providerId: user.id, status: order.status },
      data: { status: next as "IN_PROGRESS" | "DELIVERED" },
    });
    if (updated.count !== 1) throw new Error("ORDER_STATUS_CONFLICT");
    await tx.auditLog.create({
      data: { actorId: user.id, action: "ORDER_STATUS_UPDATED", targetId: id, details: `تم تحديث حالة الطلب إلى ${next}` },
    });
  }).catch((error) => {
    if (error instanceof Error && error.message === "ORDER_STATUS_CONFLICT") return;
    throw error;
  });
  revalidatePath("/provider/orders"); revalidatePath(`/orders/${id}`); revalidatePath("/admin/orders");
}
export default async function ProviderOrdersPage() {
 const user=await getCurrentUser(); if(!user) redirect("/login"); if(user.role!=="PROVIDER") redirect("/account"); if(user.status!=="ACTIVE") redirect("/pending");
 const orders=await prisma.order.findMany({where:{providerId:user.id},include:{customer:{select:{displayName:true}},payments:{where:{status:"APPROVED"},take:1}},orderBy:{createdAt:"desc"}});
 const labels:Record<string,string>={PENDING_PAYMENT:"في انتظار دفع العميل",PAYMENT_REVIEW:"مراجعة الدفع",PAID:"تم الدفع",IN_PROGRESS:"قيد التنفيذ",DELIVERED:"تم التسليم",REVISION_REQUESTED:"مطلوب تعديل",COMPLETED:"مكتمل",CANCELLED:"ملغي",REJECTED:"مرفوض"};
 return <main dir="rtl" className="min-h-screen bg-slate-50 p-5 md:p-9"><div className="mx-auto max-w-5xl"><Link href="/provider" className="font-bold text-orange-600">← لوحة مقدم الخدمة</Link><h1 className="mt-5 text-3xl font-black">طلبات العملاء</h1>
 {orders.length===0?<p className="mt-7 rounded-2xl bg-white p-8 text-center">لا توجد طلبات حتى الآن.</p>:<div className="mt-7 space-y-4">{orders.map(o=><article key={o.id} className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex flex-wrap justify-between gap-2"><strong>{o.orderNo}</strong><span className="text-sm font-bold text-orange-600">{labels[o.status]}</span></div><p className="mt-3 text-sm text-slate-600">العميل: {o.customer.displayName}</p><p className="mt-2 text-sm text-slate-600" dir="auto">وسيلة التواصل: {o.customerContact || "غير محددة"}</p><p className="mt-2 font-black">{o.servicePrice.toLocaleString("en-US")} EG</p><Link href={`/orders/${o.id}`} className="mt-4 inline-block text-sm font-bold text-orange-600">تفاصيل الطلب</Link>
 {o.status==="PAID"||o.status==="REVISION_REQUESTED"?<form action={changeStatus} className="mt-4 flex flex-wrap gap-2"><input type="hidden" name="id" value={o.id}/><button name="status" value="IN_PROGRESS" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">بدء التنفيذ</button>{o.status==="PAID"?null:<button name="status" value="DELIVERED" className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white">تسليم الخدمة</button>}</form>:null}
 {o.status==="IN_PROGRESS"?<form action={changeStatus} className="mt-4"><input type="hidden" name="id" value={o.id}/><button name="status" value="DELIVERED" className="rounded-lg bg-green-600 px-4 py-3 font-bold text-white">تأكيد تسليم الخدمة</button></form>:null}</article>)}</div>}</div></main>;
}
