import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DigitalProductReviewForm from "./DigitalProductReviewForm";
export const dynamic="force-dynamic";
export default async function AdminDigitalProductsPage(){
 const admin=await getCurrentUser();if(!admin)redirect("/login");if(admin.role!=="SUPER_ADMIN")redirect("/account");
 const products=await prisma.digitalProduct.findMany({include:{store:{include:{owner:{select:{displayName:true,email:true}}}}},orderBy:{createdAt:"desc"}});
 return <main dir="rtl" className="min-h-screen bg-slate-50 p-5 md:p-9"><section className="mx-auto max-w-5xl"><Link href="/admin" className="font-bold text-orange-600">← لوحة الإدارة</Link><h1 className="mt-5 text-3xl font-black">مراجعة المنتجات الرقمية</h1><div className="mt-6 space-y-4">{products.map(p=><article key={p.id} className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex flex-wrap justify-between gap-2"><h2 className="text-lg font-black">{p.title}</h2><span className="text-sm font-bold text-orange-600">{p.status}</span></div><p className="mt-2 text-sm text-slate-600">{p.description}</p><p className="mt-3 text-sm">المتجر: {p.store.name} · {p.store.owner.displayName} · {p.store.owner.email}</p><p className="mt-1 text-sm">السعر الصافي للبائع: {p.price.toLocaleString("en-US")} EG · الملف: {p.fileName} · {(p.sizeBytes/1024/1024).toFixed(2)} MB</p>{p.reviewNote&&<p className="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">{p.reviewNote}</p>}<DigitalProductReviewForm id={p.id}/></article>)}{products.length===0&&<p className="rounded-xl bg-white p-8 text-center text-slate-500">لا توجد منتجات لمراجعتها.</p>}</div></section></main>;
}
