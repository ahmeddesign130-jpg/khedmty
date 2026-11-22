import { createHash, randomInt } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
const hash = (id: string, code: string) => createHash("sha256").update(`${process.env.AUTH_SECRET}:${id}:${code}`).digest("hex");
const go = (req: NextRequest, path: string) => NextResponse.redirect(new URL(path, req.url), 303);
async function send(email: string, code: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY missing");
  const from = process.env.RESEND_FROM_EMAIL || "خِدمتي <onboarding@resend.dev>";
  const response = await fetch("https://api.resend.com/emails", { method:"POST", headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" }, cache:"no-store", body:JSON.stringify({from,to:[email],subject:"كود استعادة كلمة المرور - خِدمتي",text:`كود استعادة كلمة المرور هو ${code}. صالح لمدة 5 دقائق.`,html:`<div dir="rtl" style="font-family:Arial;line-height:2"><h2>استعادة كلمة المرور</h2><p>كود التحقق الخاص بك:</p><strong style="font-size:30px;letter-spacing:8px">${code}</strong><p>صالح لمدة 5 دقائق. لا تشاركه مع أي شخص.</p></div>`})});
  if (!response.ok) throw new Error(`Resend failed: ${response.status} ${await response.text()}`);
}
export async function POST(req: NextRequest) {
 try {
  const form=await req.formData(); const email=String(form.get("email")||"").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return go(req,"/forgot-password?error=email");
  const user=await prisma.user.findUnique({where:{email},select:{id:true,email:true,emailVerifiedAt:true}});
  // Avoid disclosing whether an email exists.
  if (!user || !user.emailVerifiedAt) return go(req, "/forgot-password?step=verify&email=" + encodeURIComponent(email) + "&sent=1");
  const previous=await prisma.emailOtp.findUnique({where:{userId:user.id}});
  if (previous && Date.now()-previous.lastSentAt.getTime()<60_000) return go(req,`/forgot-password?step=verify&email=${encodeURIComponent(email)}&error=wait`);
  const code=String(randomInt(100000,1000000));
  await prisma.emailOtp.upsert({where:{userId:user.id},create:{userId:user.id,codeHash:hash(user.id,code),expiresAt:new Date(Date.now()+5*60_000),lastSentAt:new Date()},update:{codeHash:hash(user.id,code),expiresAt:new Date(Date.now()+5*60_000),attempts:0,consumedAt:null,lastSentAt:new Date()}});
  await send(email,code);
  return go(req,`/forgot-password?step=verify&email=${encodeURIComponent(email)}&sent=1`);
 } catch(error) { console.error("Password reset email error:",error); return go(req,"/forgot-password?error=send"); }
}
