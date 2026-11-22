import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
const schema = z.object({ name: z.string().trim().min(2).max(80), description: z.string().trim().min(10).max(2000) });
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "سجّل الدخول أولًا." }, { status: 401 });
  if (user.role !== "PROVIDER" || user.status !== "ACTIVE") return NextResponse.json({ message: "إنشاء متجر متاح لمقدمي الخدمات المعتمدين فقط." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "راجع اسم المتجر والوصف." }, { status: 400 });
  const existing = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (existing) {
    const store = await prisma.store.update({ where: { id: existing.id }, data: parsed.data });
    return NextResponse.json({ store });
  }
  const store = await prisma.store.create({ data: { ...parsed.data, ownerId: user.id, slug: `store-${user.id.slice(-10).toLowerCase()}` } });
  await prisma.auditLog.create({ data: { actorId: user.id, action: "DIGITAL_STORE_CREATED", targetId: store.id, details: "تم إنشاء متجر رقمي." } });
  return NextResponse.json({ store }, { status: 201 });
}
