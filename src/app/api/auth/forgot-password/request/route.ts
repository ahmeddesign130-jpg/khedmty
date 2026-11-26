import { createHash, randomInt } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendKhedmtyCode } from "@/lib/email";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security";

export const dynamic = "force-dynamic";
const hash = (id: string, code: string) => {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET missing");
  return createHash("sha256").update(`${secret}:${id}:${code}`).digest("hex");
};
const go = (req: NextRequest, path: string) => NextResponse.redirect(new URL(path, req.url), 303);

export async function POST(req: NextRequest) {
  try {
    if (!enforceSameOrigin(req)) return go(req, "/forgot-password?error=invalid");
    if (!await enforceRateLimit(req, "password-reset-request-ip", "all", 10, 3600)) return go(req, "/forgot-password?error=rate_limited");
    const form = await req.formData();
    const email = String(form.get("email") || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return go(req, "/forgot-password?error=email");
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, emailVerifiedAt: true } });
    // Avoid disclosing whether an email exists.
    if (!user || !user.emailVerifiedAt) return go(req, "/forgot-password?step=verify&email=" + encodeURIComponent(email) + "&sent=1");
    const previous = await prisma.emailOtp.findUnique({ where: { userId: user.id } });
    if (previous && Date.now() - previous.lastSentAt.getTime() < 60_000) {
      return go(req, `/forgot-password?step=verify&email=${encodeURIComponent(email)}&error=wait`);
    }
    const code = String(randomInt(100000, 1000000));
    await prisma.emailOtp.upsert({
      where: { userId: user.id },
      create: { userId: user.id, codeHash: hash(user.id, code), expiresAt: new Date(Date.now() + 5 * 60_000), lastSentAt: new Date() },
      update: { codeHash: hash(user.id, code), expiresAt: new Date(Date.now() + 5 * 60_000), attempts: 0, consumedAt: null, lastSentAt: new Date() },
    });
    await sendKhedmtyCode(email, code, "password_reset");
    return go(req, `/forgot-password?step=verify&email=${encodeURIComponent(email)}&sent=1`);
  } catch (error) {
    console.error("Password reset email error:", error);
    return go(req, "/forgot-password?error=send");
  }
}
