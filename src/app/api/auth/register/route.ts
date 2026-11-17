import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

const schema = z.object({
  displayName: z.string().trim().min(2).max(70),
  email: z.string().trim().email().max(254).transform(v => v.toLowerCase()),
  password: z.string().min(10).max(72),
  role: z.enum(["CUSTOMER", "PROVIDER"]).default("CUSTOMER"),
});
export async function POST(req: NextRequest) {
  try {
    const data = schema.parse(Object.fromEntries(await req.formData()));
    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) return NextResponse.redirect(new URL("/register?error=email_exists", req.url), 303);
    const user = await prisma.user.create({ data: {
      displayName: data.displayName, email: data.email,
      passwordHash: await bcrypt.hash(data.password, 12),
      role: data.role, status: data.role === "CUSTOMER" ? "ACTIVE" : "PENDING",
    }});
    if (user.role === "CUSTOMER") {
      await createSession({ id: user.id, role: "CUSTOMER", status: "ACTIVE" });
      return NextResponse.redirect(new URL("/account", req.url), 303);
    }
    return NextResponse.redirect(new URL("/pending", req.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/register?error=registration_failed", req.url), 303);
  }
}
