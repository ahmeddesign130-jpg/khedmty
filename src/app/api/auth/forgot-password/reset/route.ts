import { NextRequest,NextResponse } from "next/server";
import { jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
export const dynamic="force-dynamic";
const go=(req:NextRequest,path:string)=>NextResponse.redirect(new URL(path,req.url),303);
export async function POST(req:NextRequest){
 try{
  const secret=process.env.AUTH_SECRET;if(!secret||secret.length<32)throw new Error("AUTH_SECRET missing");
  const token=req.cookies.get("khedmty_reset_authorized")?.value;if(!token)return go(req,"/forgot-password?error=restart");
  const {payload}=await jwtVerify(token,new TextEncoder().encode(secret));
  if(payload.purpose!=="password-reset-authorized"||!payload.sub)return go(req,"/forgot-password?error=restart");
  const form=await req.formData();const password=String(form.get("password")||"");const confirm=String(form.get("confirmPassword")||"");
  const valid=password.length>=10&&password.length<=72&&/[A-Z]/.test(password)&&/[a-z]/.test(password)&&/[0-9]/.test(password)&&/[^A-Za-z0-9]/.test(password);
  if(!valid||password!==confirm)return go(req,"/forgot-password?step=new&error=password");
  const passwordHash=await bcrypt.hash(password,12);
  await prisma.user.update({where:{id:payload.sub},data:{passwordHash}});
  const response=go(req,"/login?reset=1");
  response.cookies.set("khedmty_reset_authorized","",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:0});
  return response;
 }catch(error){console.error("Password reset completion error:",error);return go(req,"/forgot-password?error=server");}
}
