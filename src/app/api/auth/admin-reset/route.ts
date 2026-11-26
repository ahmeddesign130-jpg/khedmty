import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";\nimport { enforceRateLimit, enforceSameOrigin } from "@/lib/security";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "ahmeddesign130@gmail.com";

function redirect(req: NextRequest, status: string) {
  return NextResponse.redirect(new URL(`/admin/reset-access?status=${status}`, req.url), 303);
}

function safeTokenMatch(provided: string, expected: string) {
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  try {
    const expectedToken = process.env.ADMIN_RESET_TOKEN;
    if (!expectedToken || expectedToken.length < 32) return redirect(req, "invalid");

    const form = await req.formData();
    const resetToken = String(form.get("resetToken") || "");
    const newPassword = String(form.get("newPassword") || "");

    if (!safeTokenMatch(resetToken, expectedToken)) return redirect(req, "invalid");
    if (newPassword.length < 12 || newPassword.length > 72) return redirect(req, "password");

    const passwordHash = await bcrypt.hash(newPassword, 12);
    const result = await prisma.user.updateMany({
      where: { email: ADMIN_EMAIL, role: "SUPER_ADMIN", status: "ACTIVE" },
      data: { passwordHash },
    });

    if (result.count !== 1) return redirect(req, "account");

    console.info("Admin password reset completed for the configured primary admin account.");
    return redirect(req, "success");
  } catch (error) {
    console.error("Admin password reset failed:", error);
    return redirect(req, "error");
  }
}
