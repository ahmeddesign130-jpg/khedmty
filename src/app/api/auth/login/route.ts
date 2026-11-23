import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession, ensurePrimaryAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

function redirect303(req: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, req.url), 303);
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const email = String(form.get("email") || "").trim().toLowerCase();
    const password = String(form.get("password") || "");
    if (!email || !password) return redirect303(req, "/login?error=missing");

    const account = await prisma.user.findUnique({ where: { email } });
    if (!account) return redirect303(req, "/login?error=invalid");
    const passwordMatches = await bcrypt.compare(password, account.passwordHash);
    if (!passwordMatches) return redirect303(req, "/login?error=invalid");
    if (account.status === "SUSPENDED") return redirect303(req, "/login?error=suspended");
    if (!account.emailVerifiedAt) {
      return redirect303(req, `/verify-email?email=${encodeURIComponent(email)}&error=required`);
    }

    const user = await ensurePrimaryAdmin(account);
    if (user.role === "CUSTOMER" && user.status === "PENDING" && user.emailVerifiedAt) {
      const activated = await prisma.user.updateMany({
        where: { id: user.id, role: "CUSTOMER", status: "PENDING", emailVerifiedAt: { not: null } },
        data: { status: "ACTIVE" },
      });
      if (activated.count === 1) user.status = "ACTIVE";
    }
    await createSession({ id: user.id, role: user.role, status: user.status });
    if (user.role === "SUPER_ADMIN") return redirect303(req, "/admin");
    if (user.role === "PROVIDER" && user.status === "PENDING") return redirect303(req, "/register/provider-details");
    if (user.role === "PROVIDER") return redirect303(req, "/provider");
    return redirect303(req, "/services");
  } catch (error) {
    console.error("Login error:", error);
    return redirect303(req, "/login?error=server");
  }
}
