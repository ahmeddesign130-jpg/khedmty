import { createHash, randomInt } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendKhedmtyCode } from "@/lib/email";

export const dynamic = "force-dynamic";

function hashOtp(userId: string, code: string) {
  return createHash("sha256")
    .update(`${process.env.AUTH_SECRET || "khedmty"}:${userId}:${code}`)
    .digest("hex");
}
function redirect(req: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, req.url), 303);
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
    await sendKhedmtyCode(email, code, "registration");
    return redirect(req, `/verify-email?email=${encodeURIComponent(email)}&sent=1`);
  } catch (error) {
    console.error("OTP resend error:", error);
    return redirect(req, "/verify-email?error=send");
  }
}
