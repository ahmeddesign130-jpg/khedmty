import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function redirect303(req: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, req.url), 303);
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const displayName = String(form.get("displayName") || "").trim();
    const email = String(form.get("email") || "").trim().toLowerCase();
    const password = String(form.get("password") || "");
    const requestedRole = String(form.get("role") || "CUSTOMER");

    if (
      displayName.length < 2 || displayName.length > 70 ||
      email.length < 5 || email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      password.length < 10 || password.length > 72
    ) return redirect303(req, "/register?error=invalid");

    if (!["CUSTOMER", "PROVIDER"].includes(requestedRole)) {
      return redirect303(req, "/register?error=role");
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }, select: { id: true },
    });
    if (existingUser) return redirect303(req, "/register?error=exists");

    const passwordHash = await bcrypt.hash(password, 12);
    const role = requestedRole as "CUSTOMER" | "PROVIDER";
    const status = role === "CUSTOMER" ? "ACTIVE" : "PENDING";

    await prisma.user.create({
      data: { displayName, email, passwordHash, role, status },
    });

    return role === "CUSTOMER"
      ? redirect303(req, "/login?registered=1")
      : redirect303(req, "/pending?registered=1");
  } catch (error) {
    console.error("Registration error:", error);
    return redirect303(req, "/register?error=server");
  }
}
