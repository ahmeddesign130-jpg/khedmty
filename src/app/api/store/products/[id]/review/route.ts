import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
const schema = z.object({ status: z.enum(["APPROVED", "REJECTED", "PAUSED"]), reviewNote: z.string().max(1000).optional() });
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "SUPER_ADMIN") return NextResponse.json({ message: "الإدارة فقط." }, { status: 403 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ message: "بيانات المراجعة غير صحيحة." }, { status: 400 });
    if (parsed.data.status === "REJECTED" && !parsed.data.reviewNote?.trim()) return NextResponse.json({ message: "اكتب سبب الرفض." }, { status: 400 });
    const { id } = await params;
    const product = await prisma.digitalProduct.findUnique({ where: { id }, include: { store: true } });
    if (!product) return NextResponse.json({ message: "المنتج غير موجود." }, { status: 404 });
    const changed = await prisma.digitalProduct.updateMany({ where: { id, status: { in: ["PENDING_REVIEW", "APPROVED", "PAUSED", "REJECTED"] } }, data: { status: parsed.data.status, reviewNote: parsed.data.reviewNote?.trim() || null } });
    if (changed.count !== 1) return NextResponse.json({ message: "تعذر تحديث حالة المنتج." }, { status: 409 });
    await prisma.notification.create({ data: { userId: product.store.ownerId, title: parsed.data.status === "APPROVED" ? "تم اعتماد منتجك الرقمي" : parsed.data.status === "REJECTED" ? "تم رفض منتجك الرقمي" : "تم إيقاف منتجك الرقمي", body: parsed.data.reviewNote?.trim() || `تم تحديث حالة المنتج: ${product.title}`, href: "/provider/store" } });
    await prisma.auditLog.create({ data: { actorId: admin.id, action: `DIGITAL_PRODUCT_${parsed.data.status}`, targetId: id, details: parsed.data.reviewNote?.trim() || product.title } });
    return NextResponse.json({ message: "تم تحديث حالة المنتج وإبلاغ مقدم المتجر." });
  } catch (error) {
    console.error("DIGITAL_PRODUCT_REVIEW_ERROR", error);
    return NextResponse.json({ message: "تعذرت مراجعة المنتج." }, { status: 500 });
  }
}
