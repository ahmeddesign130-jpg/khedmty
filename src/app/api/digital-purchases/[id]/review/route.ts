import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
const schema = z.object({ status: z.enum(["PAID", "REJECTED"]), reviewNote: z.string().max(1000).optional(), transferReference: z.string().max(120).optional(), transferDate: z.string().datetime().optional() });
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "SUPER_ADMIN") return NextResponse.json({ message: "هذه العملية للإدارة فقط." }, { status: 403 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ message: "بيانات المراجعة غير صحيحة." }, { status: 400 });
    if (parsed.data.status === "REJECTED" && !parsed.data.reviewNote?.trim()) return NextResponse.json({ message: "اكتب سبب رفض الإيصال." }, { status: 400 });
    const { id } = await params;
    const purchase = await prisma.digitalPurchase.findUnique({ where: { id } });
    if (!purchase || purchase.status !== "PAYMENT_REVIEW") return NextResponse.json({ message: "عملية الدفع غير موجودة أو تمت مراجعتها." }, { status: 409 });
    if (parsed.data.status === "PAID" && !purchase.receiptPath) return NextResponse.json({ message: "لا يوجد إيصال مرفق." }, { status: 400 });
    const updated = await prisma.$transaction(async tx => {
      const result = await tx.digitalPurchase.updateMany({
        where: { id, status: "PAYMENT_REVIEW" },
        data: { status: parsed.data.status, reviewNote: parsed.data.reviewNote?.trim() || null, transferReference: parsed.data.transferReference?.trim() || null, transferDate: parsed.data.transferDate ? new Date(parsed.data.transferDate) : null, reviewedAt: new Date() },
      });
      if (result.count !== 1) throw new Error("DIGITAL_REVIEW_CONFLICT");
      await tx.notification.create({ data: { userId: purchase.buyerId, title: parsed.data.status === "PAID" ? "تم تأكيد شراء المنتج الرقمي" : "تم رفض إثبات الدفع", body: parsed.data.status === "PAID" ? `تم تأكيد شراء ${purchase.purchaseNo}. أصبح الملف متاحًا في مشترياتك.` : `تم رفض إثبات الدفع للشراء ${purchase.purchaseNo}. السبب: ${parsed.data.reviewNote}`, href: "/my-digital-purchases" } });
      await tx.notification.create({ data: { userId: purchase.sellerId, title: parsed.data.status === "PAID" ? "تم بيع منتج رقمي" : "تم رفض إثبات دفع عملية شراء", body: parsed.data.status === "PAID" ? `تم اعتماد شراء المنتج. صافي مستحقك ${purchase.sellerNet} EG.` : `تم رفض إثبات الدفع للشراء ${purchase.purchaseNo}.`, href: "/provider/store" } });
      await tx.auditLog.create({ data: { actorId: admin.id, action: parsed.data.status === "PAID" ? "DIGITAL_PAYMENT_APPROVED" : "DIGITAL_PAYMENT_REJECTED", targetId: id, details: parsed.data.reviewNote?.trim() || `تم اعتماد شراء ${purchase.purchaseNo}` } });
      return true;
    });
    return NextResponse.json({ success: updated, message: parsed.data.status === "PAID" ? "تم اعتماد الدفع وأصبح الملف متاحًا للعميل." : "تم رفض الدفع وإبلاغ العميل." });
  } catch (error) {
    if (error instanceof Error && error.message === "DIGITAL_REVIEW_CONFLICT") return NextResponse.json({ message: "تمت مراجعة العملية بالفعل." }, { status: 409 });
    console.error("DIGITAL_PAYMENT_REVIEW_ERROR", error);
    return NextResponse.json({ message: "تعذر مراجعة الدفع." }, { status: 500 });
  }
}
