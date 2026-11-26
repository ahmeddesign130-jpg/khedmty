import { createHash, randomInt } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendKhedmtyCode } from "@/lib/email";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security";

export const dynamic = "force-dynamic";

function redirect303(req: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, req.url), 303);
}

function hashOtp(userId: string, code: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must be at least 32 characters.");
  return createHash("sha256").update(`${secret}:${userId}:${code}`).digest("hex");
}

export async function POST(req: NextRequest) {
  let createdUserId: string | null = null;
  try {
    if (!enforceSameOrigin(req)) return redirect303(req, "/register?error=invalid");
    if (!await enforceRateLimit(req, "register-ip", "all", 5, 3600)) return redirect303(req, "/register?error=rate_limited");
    const form = await req.formData();
    const displayName = String(form.get("displayName") || "").trim();
    const email = String(form.get("email") || "").trim().toLowerCase();
    const phone = String(form.get("phone") || "").trim();
    const password = String(form.get("password") || "");
    const requestedRole = String(form.get("role") || "CUSTOMER");
    const termsAccepted = form.get("termsAccepted") === "yes";

    if (!termsAccepted) return redirect303(req, "/register?error=terms_required");
    if (!await enforceRateLimit(req, "register-email", email, 3, 3600)) return redirect303(req, "/register?error=rate_limited");
    if (displayName.length < 2 || displayName.length > 70 ||
        email.length < 5 || email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return redirect303(req, "/register?error=invalid");
    }
    if (!/^01[0125]\d{8}$/.test(phone)) return redirect303(req, "/register?error=phone");
    const passwordValid = password.length >= 10 && password.length <= 72 &&
      /[A-Z]/.test(password) && /[a-z]/.test(password) &&
      /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
    if (!passwordValid) return redirect303(req, "/register?error=password_policy");
    if (!["CUSTOMER", "PROVIDER"].includes(requestedRole)) {
      return redirect303(req, "/register?error=role");
    }

    const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existingUser) return redirect303(req, "/register?error=exists");

    const code = String(randomInt(100000, 1000000));
    const passwordHash = await bcrypt.hash(password, 12);
    const role = requestedRole as "CUSTOMER" | "PROVIDER";
    const user = await prisma.user.create({
      data: {
        displayName, email, passwordHash, role, status: "PENDING",
        termsAcceptedAt: new Date(), termsVersion: "2026-11-22",
        profile: { create: { phone } },
        emailOtp: {
          create: {
            codeHash: hashOtp("pending", code),
            expiresAt: new Date(Date.now() + 2 * 60 * 1000),
          },
        },
      },
      select: { id: true },
    });
    createdUserId = user.id;

    await prisma.emailOtp.update({
      where: { userId: user.id },
      data: { codeHash: hashOtp(user.id, code) },
    });
    await sendKhedmtyCode(email, code, "registration");

    return redirect303(req, `/verify-email?email=${encodeURIComponent(email)}`);
  } catch (error) {
    console.error("Registration/OTP error:", error);
    if (createdUserId) {
      await prisma.user.delete({ where: { id: createdUserId } }).catch(() => undefined);
    }
    const code = error && typeof error === "object" && "code" in error ? String((error as {code?:unknown}).code) : "";
    return redirect303(req, code === "P2022" || code === "P2021" ? "/register?error=database" : "/register?error=email_send");
  }
}
