import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createStorageDownload, storageReady } from "@/lib/storage";

export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "يجب تسجيل الدخول أولاً." }, { status: 401 });
    if (!storageReady()) return NextResponse.json({ message: "التخزين غير متاح حالياً." }, { status: 503 });
    const { id, fileId } = await params;
    const file = await prisma.orderDeliveryFile.findFirst({
      where: { id: fileId, orderId: id },
      include: { order: { select: { customerId: true, providerId: true, status: true } } },
    });
    if (!file) return NextResponse.json({ message: "الملف غير موجود." }, { status: 404 });
    const allowed = user.role === "SUPER_ADMIN" || file.order.providerId === user.id || (file.order.customerId === user.id && file.order.status === "DELIVERED");
    if (!allowed) return NextResponse.json({ message: "غير مسموح لك بتحميل هذا الملف." }, { status: 403 });
    const url = await createStorageDownload("order-deliveries", file.objectPath);
    if (!url) return NextResponse.json({ message: "تعذر تجهيز رابط التحميل." }, { status: 503 });
    return NextResponse.redirect(url, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    console.error("DELIVERY_DOWNLOAD_ERROR", error);
    return NextResponse.json({ message: "حدث خطأ أثناء تجهيز التحميل." }, { status: 500 });
  }
}
