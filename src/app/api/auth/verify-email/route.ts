import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "@/lib/auth";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security";

export const dynamic = "force-dynamic";

function hashOtp(userId: string, code: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must be at least 32 characters.");
  return createHash("sha256").update(`${secret}:${userId}:${code}`).digest("hex");
}
function redirect(req: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, req.url), 303);
}

export async function POST(req: NextRequest) {
  try {
    if (!enforceSameOrigin(req)) return redirect(req, "/verify-email?error=invalid");
    if (!await enforceRateLimit(req, "verify-email-ip", "all", 30, 900)) return redirect(req, "/verify-email?error=rate_limited");
    const form = await req.formData();
    const email = String(form.get("email") || "").trim().toLowerCase();
    const code = String(form.get("code") || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(code)) {
      return redirect(req, `/verify-email?email=${encodeURIComponent(email)}&error=invalid`);
    }
    const user = await prisma.user.findUnique({
      where: { email },
      include: { emailOtp: true },
    });
    if (!user || user.emailVerifiedAt) return redirect(req, "/login?verified=1");
    const otp = user.emailOtp;
    if (!otp || otp.consumedAt || otp.expiresAt <= new Date()) {
      return redirect(req, `/verify-email?email=${encodeURIComponent(email)}&error=expired`);
    }
    if (otp.attempts >= 5) return redirect(req, `/verify-email?email=${encodeURIComponent(email)}&error=locked`);

    const expected = Buffer.from(otp.codeHash, "hex");
    const supplied = Buffer.from(hashOtp(user.id, code), "hex");
    const matches = expected.length === supplied.length && timingSafeEqual(expected, supplied);
    if (!matches) {
      await prisma.emailOtp.updateMany({
        where: { id: otp.id, consumedAt: null, attempts: { lt: 5 } },
        data: { attempts: { increment: 1 } },
      });
      return redirect(req, `/verify-email?email=${encodeURIComponent(email)}&error=wrong`);
    }

    const consumed = await prisma.emailOtp.updateMany({
      where: { id: otp.id, codeHash: hashOtp(user.id, code), consumedAt: null, expiresAt: { gt: new Date() }, attempts: { lt: 5 } },
      data: { consumedAt: new Date() },
    });
    if (consumed.count !== 1) return redirect(req, `/verify-email?email=${encodeURIComponent(email)}&error=expired`);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date(), status: user.role === "CUSTOMER" ? "ACTIVE" : "PENDING" },
    });
    // Keep the verified user inside the same registration journey.
    // Set the session on the actual redirect response so the next page never
    // falls back to /login before provider details are completed.
    const token = await createSession({ id: updated.id, role: updated.role, status: updated.status });
    const destination = updated.role === "PROVIDER" ? "/register/provider-details?step=3&verified=1" : "/services?verified=1";
    const response = NextResponse.redirect(new URL(destination, req.url), 303);
    response.cookies.set(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);
    return response;
  } catch (error) {
    console.error("OTP verification error:", error);
    return redirect(req, "/verify-email?error=server");
  }
}
