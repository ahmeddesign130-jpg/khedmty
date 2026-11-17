import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.redirect(new URL("/login?error=invalid_credentials", req.url), 303);
  }
  if (user.status === "SUSPENDED") return NextResponse.redirect(new URL("/login?error=suspended", req.url), 303);
  await createSession({ id: user.id, role: user.role, status: user.status });
  if (user.role === "SUPER_ADMIN") return NextResponse.redirect(new URL("/admin", req.url), 303);
  if (user.role === "PROVIDER" && user.status === "PENDING") return NextResponse.redirect(new URL("/pending", req.url), 303);
  if (user.role === "PROVIDER") return NextResponse.redirect(new URL("/provider", req.url), 303);
  return NextResponse.redirect(new URL("/account", req.url), 303);
}
