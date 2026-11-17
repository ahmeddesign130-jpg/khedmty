
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const orderSchema = z.object({
  serviceId: z.string().min(1),
});

// عرض الطلبات
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "يجب تسجيل الدخول أولاً" },
        { status: 401 }
      );
    }

    const where =
      user.role === "SUPER_ADMIN"
        ? {}
        : user.role === "PROVIDER"
          ? { providerId: user.id }
          : { customerId: user.id };

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        provider: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        payments: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("GET_ORDERS_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء تحميل الطلبات" },
      { status: 500 }
    );
  }
}

// إنشاء طلب جديد
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
        { success: false, message: "هذه الخاصية للعملاء النشطين فقط" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = orderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: "رقم الخدمة غير صحيح" },
        { status: 400 }
      );
    }

    const service = await prisma.service.findUnique({
      where: {
        id: validation.data.serviceId,
      },
    });

    if (!service || service.status !== "APPROVED") {
      return NextResponse.json(
        { success: false, message: "الخدمة غير موجودة أو غير متاحة" },
        { status: 404 }
      );
    }

    if (service.providerId === user.id) {
      return NextResponse.json(
        { success: false, message: "لا يمكنك شراء خدمتك الخاصة" },
        { status: 400 }
      );
    }

    const provider = await prisma.user.findUnique({
      where: {
        id: service.providerId,
      },
    });

    if (!provider || provider.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, message: "مقدم الخدمة غير متاح" },
        { status: 400 }
      );
    }

    const settings = await prisma.platformSettings.findUnique({
      where: {
        id: "main",
      },
    });

    const commissionRate = settings?.commissionRate ?? 10;
    const servicePrice = service.price;

    const commission = Math.round(
      (servicePrice * commissionRate) / 100
    );

    const total = servicePrice + commission;

    const order = await prisma.order.create({
      data: {
        orderNo: `KH-${Date.now()}-${crypto.randomUUID()
          .slice(0, 6)
          .toUpperCase()}`,
        serviceId: service.id,
        customerId: user.id,
        providerId: service.providerId,
        servicePrice,
        commissionRate,
        commission,
        total,
        status: "PENDING_PAYMENT",
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "تم إنشاء الطلب بنجاح. أكمل الدفع اليدوي.",
        order,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("CREATE_ORDER_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء إنشاء الطلب" },
      { status: 500 }
    );
  }
}
