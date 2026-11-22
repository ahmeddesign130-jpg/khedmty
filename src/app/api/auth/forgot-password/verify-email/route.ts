import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { prisma } from "@/lib/prisma";
export const dynamic="force-dynamic";
const go=(req:NextRequest,path:string)=>NextResponse.redirect(new URL(path,req.url),303);
const hash=(id:string,code:string)=>createHash("sha256").update(`${process.env.AUTH_SECRET}:${id}:${code}`).digest("hex");
export async function POST(req:NextRequest){
 try{
  const form=await req.formData(); const email=String(form.get("email")||"").trim().toLowerCase(); const code=String(form.get("code")||"").trim();
  if(!/^\d{6}$/.test(code)) return go(req,`/forgot-password?step=verify&email=${encodeURIComponent(email)}&error=code`);
  const user=await prisma.user.findUnique({where:{email},include:{emailOtp:true}});
  const otp=user?.emailOtp;
  if(!user||!user.emailVerifiedAt||!otp||otp.consumedAt||otp.expiresAt<=new Date()) return go(req,`/forgot-password?step=verify&email=${encodeURIComponent(email)}&error=expired`);
  if(otp.attempts>=5) return go(req,`/forgot-password?step=verify&email=${encodeURIComponent(email)}&error=locked`);
  const expected=Buffer.from(otp.codeHash,"hex"), supplied=Buffer.from(hash(user.id,code),"hex");
  const valid=expected.length===supplied.length&&timingSafeEqual(expected,supplied);
  if(!valid){await prisma.emailOtp.updateMany({where:{id:otp.id,attempts:{lt:5},consumedAt:null},data:{attempts:{increment:1}}});return go(req,`/forgot-password?step=verify&email=${encodeURIComponent(email)}&error=wrong`);}
  const consumed=await prisma.emailOtp.updateMany({where:{id:otp.id,codeHash:hash(user.id,code),consumedAt:null,expiresAt:{gt:new Date()},attempts:{lt:5}},data:{consumedAt:new Date()}});\n  if(consumed.count!==1)return go(req,`/forgot-password?step=verify&email=${encodeURIComponent(email)}&error=expired`);\n  const secret=process.env.AUTH_SECRET; if(!secret||secret.length<32) throw new Error("AUTH_SECRET is not configured securely");
  const token=await new SignJWT({purpose:"password-reset-email-verified"}).setProtectedHeader({alg:"HS256"}).setSubject(user.id).setIssuedAt().setExpirationTime("10m").sign(new TextEncoder().encode(secret));
  const response=go(req,"/forgot-password?step=phone");
  response.cookies.set("khedmty_reset_email",token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:600});
  return response;
 }catch(error){console.error("Password reset email verification error:",error);return go(req,"/forgot-password?error=server");}
}
