import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();

    const displayName = String(form.get("displayName") || "").trim();
    const email = String(form.get("email") || "")
      .trim()
      .toLowerCase();
    const password = String(form.get("password") || "");
    const requestedRole = String(form.get("role") || "CUSTOMER");

    if (
      displayName.length < 2 ||
      displayName.length > 70 ||
      email.length < 5 ||
      email.length > 254 ||
      password.length < 10 ||
      password.length > 72
    ) {
      return NextResponse.redirect(
        new URL("/register?error=invalid", req.url)
      );
    }

    if (!["CUSTOMER", "PROVIDER"].includes(requestedRole)) {
      return NextResponse.redirect(
        new URL("/register?error=role", req.url)
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.redirect(
        new URL("/register?error=exists", req.url)
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const role = requestedRole as "CUSTOMER" | "PROVIDER";
    const status = role === "CUSTOMER" ? "ACTIVE" : "PENDING";

    await prisma.user.create({
      data: {
        displayName,
        email,
        passwordHash,
        role,
        status,
      },
    });

    if (role === "CUSTOMER") {
      return NextResponse.redirect(
        new URL("/login?registered=1", req.url)
      );
    }

    return NextResponse.redirect(
      new URL("/pending?registered=1", req.url)
    );
  } catch (error) {
    console.error("Registration error:", error);

    return NextResponse.redirect(
      new URL("/register?error=server", req.url)
    );
  }
      }
