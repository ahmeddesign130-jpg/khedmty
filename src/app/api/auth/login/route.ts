import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();

    const email = String(form.get("email") || "")
      .trim()
      .toLowerCase();

    const password = String(form.get("password") || "");

    if (!email || !password) {
      return NextResponse.redirect(
        new URL("/login?error=missing", req.url)
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.redirect(
        new URL("/login?error=invalid", req.url)
      );
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatches) {
      return NextResponse.redirect(
        new URL("/login?error=invalid", req.url)
      );
    }

    if (user.status === "SUSPENDED") {
      return NextResponse.redirect(
        new URL("/login?error=suspended", req.url)
      );
    }

    await createSession({
      id: user.id,
      role: user.role,
      status: user.status,
    });

    if (user.role === "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    if (user.role === "PROVIDER" && user.status === "PENDING") {
      return NextResponse.redirect(new URL("/pending", req.url));
    }

    if (user.role === "PROVIDER") {
      return NextResponse.redirect(new URL("/provider", req.url));
    }

    return NextResponse.redirect(new URL("/account", req.url));
  } catch (error) {
    console.error("Login error:", error);

    return NextResponse.redirect(
      new URL("/login?error=server", req.url)
    );
  }
}
