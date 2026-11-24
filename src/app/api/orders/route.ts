import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";
import { calculateOrderPricing } from "@/lib/pricing.mjs";

export const dynamic = "force-dynamic";

const orderSchema = z.object({
  serviceId: z.string().min(1),
  customerContact: z.string().trim().min(5).max(160),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, message: "يجب تسجيل الدخول أولاً" }, { status: 401 });

    const where = user.role === "SUPER_ADMIN" ? {} : user.role === "PROVIDER" ? { providerId: user.id } : { customerId: user.id };
    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: { select: { id: true, displayName: true, email: true } },
        provider: { select: { id: true, displayName: true, email: true } },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const safeOrders = user.role === "SUPER_ADMIN" ? orders : orders.map((order) => ({
      ...order,
      customer: { id: order.customer.id, displayName: order.customer.displayName },
      provider: { id: order.provider.id, displayName: order.provider.displayName },
      customerContact: undefined,
      servicePrice: user.role === "PROVIDER" ? order.providerNet : order.total,
      commission: undefined,
      commissionRate: undefined,
      providerNet: undefined,
      total: user.role === "PROVIDER" ? order.providerNet : order.total,
      payments: order.payments.map((payment) => ({
        id: payment.id, method: payment.method, amount: payment.amount,
        status: payment.status, createdAt: payment.createdAt,
      })),
    }));

    return NextResponse.json({ success: true, orders: safeOrders }, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (error) {
    console.error("GET_ORDERS_ERROR:", error);
    return NextResponse.json({ success: false, message: "حدث خطأ أثناء تحميل الطلبات" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, message: "يجب تسجيل الدخول أولاً" }, { status: 401 });
    if (user.role !== "CUSTOMER" || user.status !== "ACTIVE") {
      return NextResponse.json({ success: false, message: "هذه الخاصية للعملاء النشطين فقط" }, { status: 403 });
    }

    const validation = orderSchema.safeParse(await request.json());
    if (!validation.success) return NextResponse.json({ success: false, message: "بيانات الطلب غير صحيحة" }, { status: 400 });

    const service = await prisma.service.findUnique({ where: { id: validation.data.serviceId } });
    if (!service || service.status !== "APPROVED") return NextResponse.json({ success: false, message: "الخدمة غير موجودة أو غير متاحة" }, { status: 404 });
    if (service.providerId === user.id) return NextResponse.json({ success: false, message: "لا يمكنك شراء خدمتك الخاصة" }, { status: 400 });

    const provider = await prisma.user.findUnique({ where: { id: service.providerId }, select: { id: true, role: true, status: true } });
    if (!provider || provider.role !== "PROVIDER" || provider.status !== "ACTIVE") {
      return NextResponse.json({ success: false, message: "مقدم الخدمة غير متاح" }, { status: 400 });
    }

    // The service price is the final customer price approved by the admin.
    // Never accept the price or either share from the browser.
    const pricing = calculateOrderPricing(service.price);

    const order = await prisma.$transaction(async (tx) => {
      const [completedCount, activeCount] = await Promise.all([
        tx.order.count({ where: { customerId: user.id, status: "COMPLETED" } }),
        tx.order.count({ where: { customerId: user.id, status: { notIn: ["COMPLETED", "CANCELLED", "REJECTED"] } } }),
      ]);
      const capacity = 5 + Math.floor(completedCount / 5) * 5;
      if (activeCount >= capacity) throw new Error("ORDER_CAPACITY_REACHED");
      return tx.order.create({
        data: {
          orderNo: `KH-${Date.now()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
          serviceId: service.id,
          customerId: user.id,
          customerContact: validation.data.customerContact,
          providerId: service.providerId,
          ...pricing,
          status: "PENDING_PAYMENT",
        },
      });
    }, { isolationLevel: "Serializable" });

    return NextResponse.json({
      success: true,
      message: "تم إنشاء الطلب بنجاح. أكمل الدفع اليدوي.",
      order: { id: order.id, orderNo: order.orderNo, total: order.total, status: order.status },
    }, { status: 201, headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_CAPACITY_REACHED") {
      return NextResponse.json({ success: false, message: "اكتملت الأماكن المتاحة لطلباتك. أكمل طلبًا جاريًا أولًا حتى يتوفر مكان جديد." }, { status: 409 });
    }
    console.error("CREATE_ORDER_ERROR:", error);
    return NextResponse.json({ success: false, message: "حدث خطأ أثناء إنشاء الطلب" }, { status: 500 });
  }
}
