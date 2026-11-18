import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const paymentSchema = z.object({
  orderId: z.string().min(1),
  method: z.enum(["INSTAPAY", "E_AND_MONEY", "ETISALAT_CASH", "OTHER"]),
  receiptUrl: z.string().min(1).max(500),
  amount: z.number().int().positive(),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "غير مسموح لك بعرض المدفوعات." }, { status: 403 });
    }

    const payments = await prisma.payment.findMany({
      include: {
        order: {
          include: {
            customer: { select: { id: true, displayName: true, email: true } },
            provider: { select: { id: true, displayName: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ payments });
  } catch (error) {
    console.error("Payments GET error:", error);
    return NextResponse.json({ message: "حدث خطأ أثناء تحميل المدفوعات." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "يجب تسجيل الدخول أولاً." }, { status: 401 });
    }
    if (user.role !== "CUSTOMER" || user.status !== "ACTIVE") {
      return NextResponse.json({ message: "هذه الخدمة متاحة لحسابات العملاء المفعلة فقط." }, { status: 403 });
    }

    const parsed = paymentSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: "بيانات الدفع غير صحيحة." }, { status: 400 });
    }

    const { orderId, method, receiptUrl, amount } = parsed.data;
    if (!receiptUrl.startsWith(`${user.id}/`) || receiptUrl.includes("..") || receiptUrl.startsWith("/")) {
      return NextResponse.json({ message: "مسار صورة الإيصال غير صحيح." }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });

    if (!order) {
      return NextResponse.json({ message: "الطلب غير موجود." }, { status: 404 });
    }
    if (order.customerId !== user.id) {
      return NextResponse.json({ message: "هذا الطلب لا يخص حسابك." }, { status: 403 });
    }
    if (order.status !== "PENDING_PAYMENT" || order.payments.some((payment) => payment.status === "PENDING_REVIEW")) {
      return NextResponse.json({ message: "هذا الطلب لا ينتظر تسجيل دفعة جديدة." }, { status: 409 });
    }
    if (amount !== order.total) {
      return NextResponse.json({ message: "المبلغ المرسل لا يطابق إجمالي الطلب." }, { status: 400 });
    }

    // Claim the order atomically before creating the payment. Concurrent submissions
    // cannot both move the same order into payment review.
    const payment = await prisma.$transaction(async (tx) => {
      const claimed = await tx.order.updateMany({
        where: {
          id: orderId,
          customerId: user.id,
          status: "PENDING_PAYMENT",
        },
        data: { status: "PAYMENT_REVIEW" },
      });

      if (claimed.count !== 1) {
        throw new Error("PAYMENT_SUBMISSION_CONFLICT");
      }

      const created = await tx.payment.create({
        data: { orderId, method, receiptUrl, amount, status: "PENDING_REVIEW" },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "PAYMENT_SUBMITTED",
          targetId: created.id,
          details: `تم إرسال إثبات دفع للطلب ${order.orderNo} بمبلغ ${amount}`,
        },
      });

      return created;
    });

    return NextResponse.json({
      message: "تم إرسال إثبات الدفع، وهو الآن قيد مراجعة الإدارة.",
      payment,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "PAYMENT_SUBMISSION_CONFLICT") {
      return NextResponse.json({ message: "تم إرسال دفعة لهذا الطلب بالفعل أو لم يعد ينتظر الدفع." }, { status: 409 });
    }
    console.error("Payments POST error:", error);
    return NextResponse.json({ message: "حدث خطأ أثناء إرسال بيانات الدفع." }, { status: 500 });
  }
}
