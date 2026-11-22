import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
const schema = z.object({ method: z.enum(["INSTAPAY", "E_AND_MONEY", "ETISALAT_CASH", "OTHER"]), receiptPath: z.string().min(3).max(500), amount: z.number().int().positive() });
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "سجّل الدخول أولًا." }, { status: 401 });
    if (user.role !== "CUSTOMER" || user.status !== "ACTIVE") return NextResponse.json({ message: "غير مسموح." }, { status: 403 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ message: "بيانات الدفع غير صحيحة." }, { status: 400 });
    const { id } = await params;
    const purchase = await prisma.digitalPurchase.findUnique({ where: { id } });
    if (!purchase || purchase.buyerId !== user.id) return NextResponse.json({ message: "عملية الشراء غير موجودة." }, { status: 404 });
    if (!["PENDING_PAYMENT", "REJECTED"].includes(purchase.status)) return NextResponse.json({ message: "تم إرسال إثبات الدفع أو اعتماد العملية بالفعل." }, { status: 409 });
    if (parsed.data.amount !== purchase.total) return NextResponse.json({ message: "المبلغ لا يطابق إجمالي الشراء." }, { status: 400 });
    if (!parsed.data.receiptPath.startsWith(`${user.id}/`) || parsed.data.receiptPath.includes("..")) return NextResponse.json({ message: "مسار الإيصال غير صالح." }, { status: 400 });
    const wallet = (process.env.PAYMENT_WALLET_NUMBER || process.env.ETISALAT_CASH_NUMBER || "").trim();
    if (!wallet) return NextResponse.json({ message: "محفظة الاستقبال غير مفعلة." }, { status: 503 });
    const changed = await prisma.digitalPurchase.updateMany({ where: { id, buyerId: user.id, status: purchase.status }, data: { status: "PAYMENT_REVIEW", paymentMethod: parsed.data.method, receiptPath: parsed.data.receiptPath, reviewNote: null, reviewedAt: null, transferReference: null, transferDate: null } });
    if (changed.count !== 1) return NextResponse.json({ message: "تم تحديث العملية بالفعل." }, { status: 409 });
    await prisma.auditLog.create({ data: { actorId: user.id, action: "DIGITAL_PAYMENT_SUBMITTED", targetId: id, details: `تم إرسال إثبات الدفع للشراء ${purchase.purchaseNo}` } });
    return NextResponse.json({ message: "وصل إثبات الدفع إلى الإدارة للمراجعة." }, { status: 201 });
  } catch (error) {
    console.error("DIGITAL_PAYMENT_SUBMIT_ERROR", error);
    return NextResponse.json({ message: "تعذر إرسال إثبات الدفع." }, { status: 500 });
  }
}
