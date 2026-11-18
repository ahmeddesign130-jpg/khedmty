import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
async function reviewProvider(formData:FormData) {
 "use server";
 const admin=await getCurrentUser(); if(!admin||admin.role!=="SUPER_ADMIN") redirect("/login");
 const id=String(formData.get("id")||""); const action=String(formData.get("action")||""); const reason=String(formData.get("reason")||"").trim();
 if(!id||!["APPROVE","REJECT"].includes(action)||action==="REJECT"&&!reason) return;
 const provider=await prisma.user.findFirst({where:{id,role:"PROVIDER",status:"PENDING"}});
 if(!provider) return;
 await prisma.$transaction(async (tx) => {
  const updated = await tx.user.updateMany({
   where: { id, role: "PROVIDER", status: "PENDING" },
   data: { status: action === "APPROVE" ? "ACTIVE" : "SUSPENDED" },
  });
  if (updated.count !== 1) throw new Error("PROVIDER_REVIEW_CONFLICT");
  await tx.auditLog.create({
   data: { actorId: admin.id, action: action === "APPROVE" ? "PROVIDER_APPROVED" : "PROVIDER_REJECTED", targetId: id, details: action === "REJECT" ? reason : "تمت الموافقة" },
  });
 }).catch((error) => {
  if (error instanceof Error && error.message === "PROVIDER_REVIEW_CONFLICT") return;
  throw error;
 });
 revalidatePath("/admin/providers"); revalidatePath("/admin");
}
export default async function AdminProvidersPage(){
 const admin=await getCurrentUser(); if(!admin) redirect("/login"); if(admin.role!=="SUPER_ADMIN") redirect("/account");
 const providers=await prisma.user.findMany({where:{role:"PROVIDER",status:"PENDING"},select:{id:true,displayName:true,email:true,createdAt:true,profile:{select:{phone:true,bio:true,skills:true}}},orderBy:{createdAt:"asc"}});
 return <main dir="rtl" className="min-h-screen bg-slate-50 p-5 md:p-9"><div className="mx-auto max-w-5xl"><Link href="/admin" className="font-bold text-orange-600">← لوحة الإدارة</Link><h1 className="mt-5 text-3xl font-black">مراجعة مقدمي الخدمات</h1><p className="mt-2 text-slate-500">الحسابات الجديدة تنتظر موافقة الإدارة قبل استخدام لوحة مقدم الخدمة.</p>
 {providers.length===0?<div className="mt-7 rounded-2xl bg-white p-10 text-center">لا توجد حسابات جديدة قيد المراجعة.</div>:<div className="mt-7 space-y-4">{providers.map(p=><article key={p.id} className="rounded-2xl bg-white p-6 shadow-sm"><h2 className="text-xl font-black">{p.displayName}</h2><p className="mt-2 text-sm text-slate-600">{p.email}</p>{p.profile?.phone&&<p className="mt-2 text-sm">الهاتف: {p.profile.phone}</p>}{p.profile?.bio&&<p className="mt-3 leading-7 text-slate-600">{p.profile.bio}</p>}<p className="mt-2 text-xs text-slate-400">تاريخ التسجيل: {p.createdAt.toLocaleDateString("en-GB")}</p><form action={reviewProvider} className="mt-5 space-y-3"><input type="hidden" name="id" value={p.id}/><label className="block text-sm font-bold">سبب الرفض (مطلوب عند الرفض)<textarea name="reason" maxLength={1000} rows={2} className="mt-2 w-full rounded-xl border p-3"/></label><div className="flex flex-wrap gap-3"><button name="action" value="APPROVE" className="rounded-xl bg-green-600 px-5 py-3 font-bold text-white">الموافقة على الحساب</button><button name="action" value="REJECT" formNoValidate className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white">رفض الحساب</button></div></form></article>)}</div>}</div></main>;
}
