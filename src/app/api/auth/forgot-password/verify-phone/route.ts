import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security";

export const dynamic = "force-dynamic";
const go = (req: NextRequest, path: string) => NextResponse.redirect(new URL(path, req.url), 303);

export async function POST(req: NextRequest) {
  try {
    if (!enforceSameOrigin(req)) return go(req, "/forgot-password?error=invalid");
    if (!await enforceRateLimit(req, "password-reset-phone-ip", "all", 10, 900)) {
      return go(req, "/forgot-password?error=rate_limited");
    }
    const secret = process.env.AUTH_SECRET;
    if (!secret || secret.length < 32) throw new Error("AUTH_SECRET missing");
    const proof = req.cookies.get("khedmty_reset_email")?.value;
    if (!proof) return go(req, "/forgot-password?error=restart");
    const { payload } = await jwtVerify(proof, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
    if (payload.purpose !== "password-reset-email-verified" || !payload.sub) return go(req, "/forgot-password?error=restart");
    if (!await enforceRateLimit(req, "password-reset-phone-user", payload.sub, 5, 900)) {
      return go(req, "/forgot-password?error=rate_limited");
    }
    const form = await req.formData();
    const phone = String(form.get("phone") || "").replace(/[\\s-]/g, "");
    if (!/^01[0125]\\d{8}$/.test(phone)) return go(req, "/forgot-password?step=phone&error=phone");
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, include: { profile: { select: { phone: true } } } });
    const stored = (user?.profile?.phone || "").replace(/[\\s-]/g, "");
    if (!user || !stored || stored !== phone) return go(req, "/forgot-password?step=phone&error=mismatch");
    const reset = await new SignJWT({ purpose: "password-reset-authorized" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(user.id)
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(new TextEncoder().encode(secret));
    const secure = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "preview";
    const response = go(req, "/forgot-password?step=new");
    response.cookies.set("khedmty_reset_authorized", reset, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 300 });
    response.cookies.set("khedmty_reset_email", "", { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    console.error("Password reset phone verification error:", error);
    return go(req, "/forgot-password?error=server");
  }
}
