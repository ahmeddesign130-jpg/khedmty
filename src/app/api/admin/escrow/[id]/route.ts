import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  decision: z.enum(["RELEASE_TO_PROVIDER", "REFUND_CUSTOMER"]),
  externalTransferConfirmed: z.literal(true),
  note: z.string().trim().max(1000).optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "غير مسموح." }, { status: 403 });
    }
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ message: "أكد تنفيذ التحويل الخارجي أولًا وأدخل قرارًا صحيحًا." }, { status: 400 });
    const { id } = await params;
    const order = await prisma.order.findUnique({ where: { id }, include: { dispute: true } });
    if (!order) return NextResponse.json({ message: "الطلب غير موجود." }, { status: 404 });
    if (order.escrowStatus !== "HELD" && order.escrowStatus !== "DISPUTED") {
      return NextResponse.json({ message: "المبلغ ليس محجوزًا أو سبق تسويته." }, { status: 409 });
    }
    if (parsed.data.decision === "RELEASE_TO_PROVIDER" && order.escrowStatus === "HELD" && order.status !== "COMPLETED") {
      return NextResponse.json({ message: "لا يمكن صرف المستحقات قبل تأكيد استلام العميل أو حسم النزاع لصالح مقدم الخدمة." }, { status: 409 });
    }
    if (parsed.data.decision === "REFUND_CUSTOMER" && order.escrowStatus !== "DISPUTED") {
      return NextResponse.json({ message: "لا يمكن تسجيل رد المبلغ إلا بعد فتح نزاع ومراجعته." }, { status: 409 });
    }
    if (order.escrowStatus === "DISPUTED" && !order.dispute) {
      return NextResponse.json({ message: "حالة النزاع غير مكتملة؛ أوقف التسوية وراجع السجلات." }, { status: 409 });
    }

    await prisma.$transaction(async (tx) => {
      const entryType = parsed.data.decision === "RELEASE_TO_PROVIDER" ? "RELEASE" : "REFUND";
      const nextEscrow = entryType === "RELEASE" ? "RELEASED" : "REFUNDED";
      const changed = await tx.order.updateMany({
        where: { id, escrowStatus: order.escrowStatus },
        data: { escrowStatus: nextEscrow, ...(entryType === "RELEASE" ? { escrowReleasedAt: new Date() } : {}) },
      });
      if (changed.count !== 1) throw new Error("ESCROW_SETTLEMENT_CONFLICT");
      await tx.escrowLedger.create({
        data: {
          orderId: id,
          entryType,
          amount: order.escrowAmount,
          actorId: admin.id,
          note: parsed.data.note || (entryType === "RELEASE" ? "تم تسجيل صرف المستحقات بعد تأكيد التحويل الخارجي يدويًا." : "تم تسجيل رد المبلغ بعد تأكيد التحويل الخارجي يدويًا."),
        },
      });
      if (order.dispute) {
        await tx.dispute.update({
          where: { orderId: id },
          data: {
            status: entryType === "RELEASE" ? "RESOLVED_FOR_PROVIDER" : "RESOLVED_FOR_CUSTOMER",
            adminNote: parsed.data.note || null,
            resolvedAt: new Date(),
          },
        });
      }
      if (entryType === "REFUND") {
        await tx.order.update({ where: { id }, data: { status: "CANCELLED" } });
      } else if (order.dispute) {
        await tx.order.update({ where: { id }, data: { status: "COMPLETED" } });
      }
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: entryType === "RELEASE" ? "ESCROW_RELEASE_RECORDED" : "ESCROW_REFUND_RECORDED",
          targetId: id,
          details: parsed.data.note || "تسوية يدوية بعد تأكيد التحويل الخارجي.",
        },
      });
    });
    return NextResponse.json({ success: true, message: "تم تسجيل التسوية. هذا الإجراء لا ينفذ تحويلًا ماليًا تلقائيًا." });
  } catch (error) {
    if (error instanceof Error && error.message === "ESCROW_SETTLEMENT_CONFLICT") return NextResponse.json({ message: "تمت تسوية هذا المبلغ بالفعل أو تغيرت حالته." }, { status: 409 });
    console.error("ESCROW_SETTLEMENT_ERROR:", error);
    return NextResponse.json({ message: "تعذر تسجيل التسوية." }, { status: 500 });
  }
}
