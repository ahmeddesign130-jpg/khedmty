import { createHash, randomInt } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function hashOtp(userId: string, code: string) {
  return createHash("sha256")
    .update(`${process.env.AUTH_SECRET || "khedmty"}:${userId}:${code}`)
    .digest("hex");
}
function redirect(req: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, req.url), 303);
}
async function sendOtp(email: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || "خِدمتي <onboarding@resend.dev>",
      to: [email],
      subject: "كود تأكيد البريد الإلكتروني - خِدمتي",
      text: `كود تأكيد بريدك في خِدمتي هو: ${code}. صالح لمدة دقيقتين.`,
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Resend failed: ${response.status}`);
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const email = String(form.get("email") || "").trim().toLowerCase();
    if (!email) return redirect(req, "/verify-email?error=invalid");
    const user = await prisma.user.findUnique({ where: { email }, include: { emailOtp: true } });
    if (!user || user.emailVerifiedAt || !user.emailOtp) return redirect(req, "/login");
    const otp = user.emailOtp;
    if (Date.now() - otp.lastSentAt.getTime() < 60_000) {
      return redirect(req, `/verify-email?email=${encodeURIComponent(email)}&error=wait`);
    }
    const code = String(randomInt(100000, 1000000));
    await prisma.emailOtp.update({
      where: { userId: user.id },
      data: {
        codeHash: hashOtp(user.id, code),
        expiresAt: new Date(Date.now() + 2 * 60 * 1000),
        attempts: 0,
        consumedAt: null,
        lastSentAt: new Date(),
      },
    });
    await sendOtp(email, code);
    return redirect(req, `/verify-email?email=${encodeURIComponent(email)}&sent=1`);
  } catch (error) {
    console.error("OTP resend error:", error);
    return redirect(req, "/verify-email?error=send");
  }
}
