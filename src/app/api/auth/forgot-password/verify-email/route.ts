import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security";

export const dynamic = "force-dynamic";
const go = (req: NextRequest, path: string) => NextResponse.redirect(new URL(path, req.url), 303);
const hash = (id: string, code: string) => {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET missing");
  return createHash("sha256").update(`${secret}:${id}:${code}`).digest("hex");
};

export async function POST(req: NextRequest) {
  try {
    if (!enforceSameOrigin(req)) return go(req, "/forgot-password?error=invalid");
    if (!await enforceRateLimit(req, "password-reset-verify-email-ip", "all", 20, 900)) return go(req, "/forgot-password?error=rate_limited");
    const form = await req.formData();
    const email = String(form.get("email") || "").trim().toLowerCase();
    const code = String(form.get("code") || "").trim();
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email) || email.length > 254 || !/^\\d{6}$/.test(code)) {
      return go(req, `/forgot-password?step=verify&email=${encodeURIComponent(email)}&error=code`);
    }
    const user = await prisma.user.findUnique({ where: { email }, include: { emailOtp: true } });
    if (!user) return go(req, "/forgot-password?step=verify&error=expired");
    if (!await enforceRateLimit(req, "password-reset-verify-email-user", user.id, 5, 900)) return go(req, "/forgot-password?step=verify&error=locked");
    const otp = user.emailOtp;
    if (!user.emailVerifiedAt || !otp || otp.consumedAt || otp.expiresAt <= new Date() || otp.attempts >= 5) {
      return go(req, `/forgot-password?step=verify&email=${encodeURIComponent(email)}&error=expired`);
    }
    const expected = Buffer.from(otp.codeHash, "hex");
    const supplied = Buffer.from(hash(user.id, code), "hex");
    const valid = expected.length === supplied.length && timingSafeEqual(expected, supplied);
    if (!valid) {
      await prisma.emailOtp.updateMany({ where: { id: otp.id, attempts: { lt: 5 }, consumedAt: null }, data: { attempts: { increment: 1 } } });
      return go(req, `/forgot-password?step=verify&email=${encodeURIComponent(email)}&error=wrong`);
    }
    const consumed = await prisma.emailOtp.updateMany({
      where: { id: otp.id, codeHash: hash(user.id, code), consumedAt: null, expiresAt: { gt: new Date() }, attempts: { lt: 5 } },
      data: { consumedAt: new Date() },
    });
    if (consumed.count !== 1) return go(req, "/forgot-password?step=verify&error=expired");
    const secret = process.env.AUTH_SECRET;
    if (!secret || secret.length < 32) throw new Error("AUTH_SECRET missing");
    const token = await new SignJWT({ purpose: "password-reset-email-verified" })
      .setProtectedHeader({ alg: "HS256" }).setSubject(user.id).setIssuedAt().setExpirationTime("10m")
      .sign(new TextEncoder().encode(secret));
    const secure = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "preview";
    const response = go(req, "/forgot-password?step=phone");
    response.cookies.set("khedmty_reset_email", token, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 600 });
    return response;
  } catch (error) {
    console.error("Password reset email verification error:", error);
    return go(req, "/forgot-password?error=server");
  }
}
