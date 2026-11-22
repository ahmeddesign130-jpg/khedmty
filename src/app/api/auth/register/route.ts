import { createHash, randomInt } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function redirect303(req: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, req.url), 303);
}

function hashOtp(userId: string, code: string) {
  return createHash("sha256")
    .update(`${process.env.AUTH_SECRET || "khedmty"}:${userId}:${code}`)
    .digest("hex");
}

async function sendOtp(email: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
  const from = process.env.RESEND_FROM_EMAIL || "خِدمتي <onboarding@resend.dev>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "كود تأكيد البريد الإلكتروني - خِدمتي",
      text: `كود تأكيد بريدك في خِدمتي هو: ${code}\nالكود صالح لمدة دقيقتين ولا تشاركه مع أي شخص.`,
      html: `<div dir="rtl" style="font-family:Arial,sans-serif;line-height:2"><h2>أهلًا بك في خِدمتي</h2><p>استخدم الكود التالي لتأكيد بريدك الإلكتروني:</p><div style="font-size:32px;font-weight:bold;letter-spacing:8px;padding:16px;background:#fff4e8;border-radius:12px;text-align:center">${code}</div><p>الكود صالح لمدة دقيقتين، ولا تشاركه مع أي شخص.</p></div>`,
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    const details = await response.text().catch(() => "");
    console.error("Resend email error:", response.status, details);
    throw new Error("Email delivery failed");
  }
}

export async function POST(req: NextRequest) {
  let createdUserId: string | null = null;
  try {
    const form = await req.formData();
    const displayName = String(form.get("displayName") || "").trim();
    const email = String(form.get("email") || "").trim().toLowerCase();
    const phone = String(form.get("phone") || "").trim();
    const password = String(form.get("password") || "");
    const requestedRole = String(form.get("role") || "CUSTOMER");
    const termsAccepted = form.get("termsAccepted") === "yes";

    if (!termsAccepted) return redirect303(req, "/register?error=terms_required");
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
    await sendOtp(email, code);

    return redirect303(req, `/verify-email?email=${encodeURIComponent(email)}`);
  } catch (error) {
    console.error("Registration/OTP error:", error);
    if (createdUserId) {
      await prisma.user.delete({ where: { id: createdUserId } }).catch(() => undefined);
    }
    return redirect303(req, "/register?error=email_send");
  }
}
