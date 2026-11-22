import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createStorageDownload } from "@/lib/storage";
export const dynamic="force-dynamic";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const user=await getCurrentUser();if(!user)return NextResponse.json({message:"سجّل الدخول أولًا."},{status:401});
 const {id}=await params;const product=await prisma.digitalProduct.findUnique({where:{id},include:{store:{select:{ownerId:true}}}});
 if(!product)return NextResponse.json({message:"المنتج غير موجود."},{status:404});
 if(user.role!=="SUPER_ADMIN"&&product.store.ownerId!==user.id)return NextResponse.json({message:"غير مسموح بالوصول للملف."},{status:403});
 const url=await createStorageDownload("digital-products",product.filePath);if(!url)return NextResponse.json({message:"تعذر فتح الملف."},{status:503});
 return NextResponse.redirect(url,{headers:{"Cache-Control":"no-store, private"}});
}
