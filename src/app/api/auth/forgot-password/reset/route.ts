import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security";

export const dynamic = "force-dynamic";
const go = (req: NextRequest, path: string) => NextResponse.redirect(new URL(path, req.url), 303);

export async function POST(req: NextRequest) {
  try {
    if (!enforceSameOrigin(req)) return go(req, "/forgot-password?error=invalid");
    if (!await enforceRateLimit(req, "password-reset-finish-ip", "all", 10, 900)) return go(req, "/forgot-password?error=rate_limited");
    const secret = process.env.AUTH_SECRET;
    if (!secret || secret.length < 32) throw new Error("AUTH_SECRET missing");
    const token = req.cookies.get("khedmty_reset_authorized")?.value;
    if (!token) return go(req, "/forgot-password?error=restart");
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
    if (payload.purpose !== "password-reset-authorized" || !payload.sub || typeof payload.sv !== "number") return go(req, "/forgot-password?error=restart");
    if (!await enforceRateLimit(req, "password-reset-finish-user", payload.sub, 3, 900)) return go(req, "/forgot-password?error=rate_limited");
    const form = await req.formData();
    const password = String(form.get("password") || "");
    const confirm = String(form.get("confirmPassword") || "");
    const valid = password.length >= 10 && password.length <= 72 && /[A-Z]/.test(password) &&
      /[a-z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password);
    if (!valid || password !== confirm) return go(req, "/forgot-password?step=new&error=password");
    const passwordHash = await bcrypt.hash(password, 12);
    const changed = await prisma.user.updateMany({
      where: { id: payload.sub, sessionVersion: payload.sv },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    });
    if (changed.count !== 1) return go(req, "/forgot-password?error=restart");
    const secure = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "preview";
    const response = go(req, "/login?reset=1");
    response.cookies.set("khedmty_reset_authorized", "", { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    console.error("Password reset completion error:", error);
    return go(req, "/forgot-password?error=server");
  }
}
