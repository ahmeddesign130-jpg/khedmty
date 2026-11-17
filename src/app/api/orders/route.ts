import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const orderSchema = z.object({
  serviceId: z.string().min(1, "رقم الخدمة مطلوب"),
});

// عرض طلبات المستخدم الحالي
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "يجب تسجيل الدخول أولاً" },
        { status: 401 }
      );
    }

    const orders = await prisma.order.findMany({
      where:
        user.role === "SUPER_ADMIN"
          ? {}
          : user.role === "PROVIDER"
            ? { providerId: user.id }
            : { customerId: user.id },
      include: {
        service: true,
        customer: {
          select: { id: true, email: true },
        },
        provider: {
          select: { id: true, email: true },
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

// إنشاء طلب شراء جديد
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
    const validation = orderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: "بيانات الطلب غير صحيحة" },
        { status: 400 }
      );
    }

    const service = await prisma.service.findUnique({
      where: { id: validation.data.serviceId },
    });

    if (!service || service.status !== "APPROVED") {
      return NextResponse.json(
        { success: false, message: "الخدمة غير موجودة أو غير متاحة للشراء" },
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
      where: { id: service.providerId },
    });

    if (!provider || provider.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, message: "مقدم الخدمة غير متاح حالياً" },
        { status: 400 }
      );
    }

    // العمولة الافتراضية 10%، ويمكن ربطها بإعدادات الإدارة لاحقاً.
    const commissionRateBps = 1000;
    const servicePriceMinor = service.priceMinor;

    const commissionMinor = Math.round(
      (servicePriceMinor * commissionRateBps) / 10000
    );

    const totalMinor = servicePriceMinor + commissionMinor;

    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + service.deliveryDays);

    const order = await prisma.order.create({
      data: {
        publicCode: `KH-${Date.now()}-${crypto.randomUUID()
          .slice(0, 6)
          .toUpperCase()}`,
        serviceId: service.id,
        customerId: user.id,
        providerId: service.providerId,
        status: "PENDING_PAYMENT",
        servicePriceMinor,
        commissionRateBps,
        commissionMinor,
        totalMinor,
        dueAt,
      },
      include: {
        service: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "تم إنشاء الطلب. أكمل خطوات الدفع اليدوي.",
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
