import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
export const dynamic="force-dynamic";
export default async function StorePage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const store=await prisma.store.findFirst({where:{slug,isActive:true},include:{owner:{select:{displayName:true}},products:{where:{status:"APPROVED"},orderBy:{createdAt:"desc"}}}});
 if(!store)notFound();
 return <main dir="rtl" className="min-h-screen bg-slate-50 px-5 py-10"><section className="mx-auto max-w-6xl"><Link href="/stores" className="font-bold text-orange-600">← كل المتاجر</Link><header className="mt-5 rounded-3xl bg-[#14213d] p-7 text-white"><p className="text-sm text-orange-300">متجر رقمي</p><h1 className="mt-2 text-3xl font-black">{store.name}</h1><p className="mt-3 leading-8 text-slate-200">{store.description}</p><p className="mt-4 text-sm text-slate-300">صاحب المتجر: {store.owner.displayName}</p></header><h2 className="mt-8 text-2xl font-black text-[#14213d]">المنتجات المتاحة</h2><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{store.products.map(p=><Link key={p.id} href={`/digital-products/${p.id}`} className="rounded-2xl bg-white p-5 shadow-sm"><span className="inline-flex rounded-lg bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">منتج رقمي</span><h3 className="mt-4 text-lg font-black">{p.title}</h3><p className="mt-2 line-clamp-3 text-sm leading-7 text-slate-500">{p.description}</p><p className="mt-5 font-black text-orange-600">يبدأ من {p.price.toLocaleString("en-US")} EG + عمولة المنصة</p></Link>)}</div>{store.products.length===0&&<p className="mt-6 rounded-xl bg-white p-6 text-slate-500">لا توجد منتجات معتمدة في هذا المتجر حاليًا.</p>}</section></main>;
}
