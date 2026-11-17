import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const paymentSchema = z.object({
  orderId: z.string().min(1),
  method: z.enum([
    "INSTAPAY",
    "E_AND_MONEY",
    "ETISALAT_CASH",
    "OTHER",
  ]),
  amountMinor: z.number().int().positive(),
  receiptUrl: z.string().url().max(2000),
  transactionReference: z.string().trim().max(150).optional(),
});

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "يجب تسجيل الدخول أولاً" },
        { status: 401 }
      );
    }

    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, message: "غير مسموح بعرض جميع المدفوعات" },
        { status: 403 }
      );
    }

    const payments = await prisma.payment.findMany({
      include: {
        order: {
          include: {
            customer: {
              select: { id: true, email: true },
            },
            provider: {
              select: { id: true, email: true },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      payments,
    });
  } catch (error) {
    console.error("GET_PAYMENTS_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء تحميل المدفوعات" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "يجب تسجيل الدخول أولاً" },
        { status: 401 }
      );
    }

    if (user.role !== "CUSTOMER" || user.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, message: "هذه الخاصية متاحة للعملاء النشطين فقط" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = paymentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: "بيانات الدفع غير صحيحة" },
        { status: 400 }
      );
    }

    const data = validation.data;

    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
    });

    if (!order || order.customerId !== user.id) {
      return NextResponse.json(
        { success: false, message: "الطلب غير موجود" },
        { status: 404 }
      );
    }

    if (
      order.status !== "PENDING_PAYMENT" &&
      order.status !== "PAYMENT_REVIEW"
    ) {
      return NextResponse.json(
        { success: false, message: "الطلب لا يحتاج إلى دفع حالياً" },
        { status: 409 }
      );
    }

    if (data.amountMinor !== order.totalMinor) {
      return NextResponse.json(
        { success: false, message: "المبلغ لا يطابق إجمالي الطلب" },
        { status: 400 }
      );
    }

    const existingPayment = await prisma.payment.findFirst({
      where: {
        orderId: order.id,
        status: "PENDING_REVIEW",
      },
    });

    if (existingPayment) {
      return NextResponse.json(
        { success: false, message: "يوجد إيصال قيد المراجعة لهذا الطلب بالفعل" },
        { status: 409 }
      );
    }

    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        method: data.method,
        amountMinor: data.amountMinor,
        receiptUrl: data.receiptUrl,
        transactionReference: data.transactionReference,
        status: "PENDING_REVIEW",
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { status: "PAYMENT_REVIEW" },
    });

    return NextResponse.json(
      {
        success: true,
        message: "تم إرسال بيانات الدفع إلى الإدارة للمراجعة",
        payment,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("CREATE_PAYMENT_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء تسجيل الدفع" },
      { status: 500 }
    );
  }
      }
