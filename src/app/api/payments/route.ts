import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const paymentSchema = z.object({
  orderId: z.string().min(1),
  method: z.enum([
    "INSTAPAY",
    "E_AND_MONEY",
    "ETISALAT_CASH",
    "OTHER",
  ]),
  receiptUrl: z.string().url(),
  amount: z.number().int().positive(),
});

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { message: "غير مسموح لك بعرض المدفوعات." },
        { status: 403 }
      );
    }

    const payments = await prisma.payment.findMany({
      include: {
        order: {
          include: {
            customer: {
              select: { id: true, displayName: true, email: true },
            },
            provider: {
              select: { id: true, displayName: true, email: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ payments });
  } catch (error) {
    console.error("Payments GET error:", error);

    return NextResponse.json(
      { message: "حدث خطأ أثناء تحميل المدفوعات." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { message: "يجب تسجيل الدخول أولاً." },
        { status: 401 }
      );
    }

    if (user.role !== "CUSTOMER" || user.status !== "ACTIVE") {
      return NextResponse.json(
        { message: "هذه الخدمة متاحة لحسابات العملاء المفعلة فقط." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = paymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "بيانات الدفع غير صحيحة." },
        { status: 400 }
      );
    }

    const { orderId, method, receiptUrl, amount } = parsed.data;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });

    if (!order) {
      return NextResponse.json(
        { message: "الطلب غير موجود." },
        { status: 404 }
      );
    }

    if (order.customerId !== user.id) {
      return NextResponse.json(
        { message: "هذا الطلب لا يخص حسابك." },
        { status: 403 }
      );
    }

    if (order.status !== "PENDING_PAYMENT") {
      return NextResponse.json(
        { message: "هذا الطلب لا ينتظر تسجيل دفعة جديدة." },
        { status: 400 }
      );
    }

    const pendingPayment = order.payments.some(
      (payment) => payment.status === "PENDING_REVIEW"
    );

    if (pendingPayment) {
      return NextResponse.json(
        { message: "توجد دفعة قيد المراجعة لهذا الطلب بالفعل." },
        { status: 409 }
      );
    }

    if (amount !== order.total) {
      return NextResponse.json(
        { message: "المبلغ المرسل لا يطابق إجمالي الطلب." },
        { status: 400 }
      );
    }

    const payment = await prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          orderId,
          method,
          receiptUrl,
          amount,
          status: "PENDING_REVIEW",
        },
      });

      await tx.order.update({
        where: { id: orderId },
        data: { status: "PAYMENT_REVIEW" },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "PAYMENT_SUBMITTED",
          targetId: created.id,
          details: `تم إرسال دفعة للطلب ${order.orderNo} بمبلغ ${amount}`,
        },
      });

      return created;
    });

    return NextResponse.json(
      {
        message: "تم إرسال بيانات الدفع، وهي الآن قيد مراجعة الإدارة.",
        payment,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Payments POST error:", error);

    return NextResponse.json(
      { message: "حدث خطأ أثناء إرسال بيانات الدفع." },
      { status: 500 }
    );
  }
}
