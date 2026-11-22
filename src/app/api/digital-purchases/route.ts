import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "سجّل الدخول للشراء." }, { status: 401 });
    if (user.role !== "CUSTOMER" || user.status !== "ACTIVE") return NextResponse.json({ message: "الشراء متاح لحسابات العملاء المفعلة فقط." }, { status: 403 });
    const body = await request.json().catch(() => ({}));
    const productId = typeof body.productId === "string" ? body.productId : "";
    const product = await prisma.digitalProduct.findFirst({ where: { id: productId, status: "APPROVED", store: { isActive: true } }, include: { store: true } });
    if (!product) return NextResponse.json({ message: "المنتج غير متاح للشراء." }, { status: 404 });
    if (product.store.ownerId === user.id) return NextResponse.json({ message: "لا يمكنك شراء منتج من متجرك." }, { status: 400 });
    const settings = await prisma.platformSettings.findUnique({ where: { id: "main" }, select: { commissionRate: true } });
    const rate = Math.min(80, Math.max(0, settings?.commissionRate ?? 20));
    const total = Math.ceil(product.price / (1 - rate / 100));
    const commission = total - product.price;
    const purchase = await prisma.digitalPurchase.create({
      data: {
        purchaseNo: `KD-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
        productId: product.id, buyerId: user.id, sellerId: product.store.ownerId,
        productPrice: product.price, commissionRate: rate, commission, sellerNet: product.price,
        total, status: "PENDING_PAYMENT",
      },
      select: { id: true, purchaseNo: true, total: true },
    });
    await prisma.auditLog.create({ data: { actorId: user.id, action: "DIGITAL_PURCHASE_CREATED", targetId: purchase.id, details: `إنشاء شراء رقمي ${purchase.purchaseNo}` } });
    return NextResponse.json({ purchase }, { status: 201 });
  } catch (error) {
    console.error("DIGITAL_PURCHASE_CREATE_ERROR", error);
    return NextResponse.json({ message: "تعذر إنشاء عملية الشراء." }, { status: 500 });
  }
}
