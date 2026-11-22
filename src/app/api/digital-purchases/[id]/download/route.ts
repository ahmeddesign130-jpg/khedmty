import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createStorageDownload } from "@/lib/storage";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "سجّل الدخول أولًا." }, { status: 401 });
    const { id } = await params;
    const purchase = await prisma.digitalPurchase.findUnique({ where: { id }, include: { product: true } });
    if (!purchase || purchase.buyerId !== user.id || purchase.status !== "PAID") return NextResponse.json({ message: "الملف غير متاح. يجب اعتماد الدفع أولًا." }, { status: 403 });
    const url = await createStorageDownload("digital-products", purchase.product.filePath);
    if (!url) return NextResponse.json({ message: "تعذر تجهيز رابط التحميل." }, { status: 503 });
    return NextResponse.redirect(url, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    console.error("DIGITAL_DOWNLOAD_ERROR", error);
    return NextResponse.json({ message: "تعذر تحميل الملف." }, { status: 500 });
  }
}
