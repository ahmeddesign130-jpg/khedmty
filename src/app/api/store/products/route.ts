import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
const schema = z.object({
  title: z.string().trim().min(3).max(120), description: z.string().trim().min(20).max(5000),
  price: z.number().int().positive().max(10000000), filePath: z.string().min(5).max(500),
  fileName: z.string().trim().min(1).max(180), mimeType: z.string().min(3).max(150),
  sizeBytes: z.number().int().positive().max(100 * 1024 * 1024),
});
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "سجّل الدخول أولًا." }, { status: 401 });
    if (user.role !== "PROVIDER" || user.status !== "ACTIVE") return NextResponse.json({ message: "هذه العملية متاحة لمقدمي الخدمات المعتمدين فقط." }, { status: 403 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ message: "بيانات المنتج غير مكتملة أو غير صحيحة." }, { status: 400 });
    const data = parsed.data;
    if (!data.filePath.startsWith(`${user.id}/`) || data.filePath.includes("..") || data.filePath.startsWith("/")) return NextResponse.json({ message: "مسار الملف غير صالح." }, { status: 400 });
    const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
    if (!store || !store.isActive) return NextResponse.json({ message: "المتجر غير متاح." }, { status: 403 });
    const product = await prisma.digitalProduct.create({ data: { ...data, storeId: store.id, status: "PENDING_REVIEW" } });
    await prisma.auditLog.create({ data: { actorId: user.id, action: "DIGITAL_PRODUCT_SUBMITTED", targetId: product.id, details: `تم إرسال المنتج الرقمي للمراجعة: ${product.title}` } });
    return NextResponse.json({ product, message: "تم إرسال المنتج للمراجعة، وسيظهر بعد موافقة الإدارة." }, { status: 201 });
  } catch (error) {
    console.error("DIGITAL_PRODUCT_CREATE_ERROR", error);
    return NextResponse.json({ message: "تعذر إضافة المنتج حاليًا." }, { status: 500 });
  }
}
