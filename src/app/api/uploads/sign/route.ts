import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createStorageUpload, ensurePrivateStorageBucket, serviceMediaPublicUrl, storageReady } from "@/lib/storage";

export const dynamic = "force-dynamic";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 40 * 1024 * 1024;
const MAX_DELIVERY_BYTES = 50 * 1024 * 1024;
const MAX_DIGITAL_PRODUCT_BYTES = 100 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const DIGITAL_TYPES = new Set([...IMAGE_TYPES, ...VIDEO_TYPES, "application/pdf", "application/zip", "audio/mpeg", "audio/mp4", "audio/wav", "text/plain", "text/csv", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.openxmlformats-officedocument.presentationml.presentation"]);
const DELIVERY_TYPES = new Set([
  ...IMAGE_TYPES, ...VIDEO_TYPES, "application/pdf",
  "application/zip", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "يجب تسجيل الدخول أولاً." }, { status: 401 });
    if (!storageReady()) return NextResponse.json({ message: "التخزين غير مهيأ بعد. أضف إعدادات Supabase في Vercel." }, { status: 503 });

    const body = await request.json();
    const kind = body?.kind;
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const mimeType = typeof body?.mimeType === "string" ? body.mimeType : "";
    const size = Number(body?.size);
    if (!Number.isSafeInteger(size) || size <= 0 || !name || name.length > 180) {
      return NextResponse.json({ message: "بيانات الملف غير صحيحة." }, { status: 400 });
    }

    let bucket: string;
    let maxSize: number;
    let objectPath: string;
    if (kind === "service") {
      if (user.role !== "PROVIDER" || user.status !== "ACTIVE") return NextResponse.json({ message: "رفع ملفات الخدمات لمقدمي الخدمات المعتمدين فقط." }, { status: 403 });
      if (!IMAGE_TYPES.has(mimeType) && !VIDEO_TYPES.has(mimeType)) return NextResponse.json({ message: "الصيغ المسموحة: JPG وPNG وWEBP وMP4 وWEBM وMOV." }, { status: 400 });
      maxSize = VIDEO_TYPES.has(mimeType) ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
      bucket = "service-media";
      objectPath = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${mimeType === "image/jpeg" ? "jpg" : mimeType === "video/quicktime" ? "mov" : mimeType.split("/")[1]}`;
    } else if (kind === "receipt") {
      if (user.role !== "CUSTOMER" || user.status !== "ACTIVE") return NextResponse.json({ message: "رفع الإيصال متاح للعملاء فقط." }, { status: 403 });
      if (!IMAGE_TYPES.has(mimeType)) return NextResponse.json({ message: "إيصال الدفع يجب أن يكون صورة JPG أو PNG أو WEBP." }, { status: 400 });
      maxSize = MAX_IMAGE_BYTES;
      bucket = "payment-receipts";
      objectPath = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1]}`;
    } else if (kind === "digital-product") {
      if (user.role !== "PROVIDER" || user.status !== "ACTIVE") return NextResponse.json({ message: "إنشاء منتجات رقمية متاح لمقدمي الخدمات المعتمدين فقط." }, { status: 403 });
      const store = await prisma.store.findUnique({ where: { ownerId: user.id }, select: { id: true } });
      if (!store) return NextResponse.json({ message: "أنشئ متجرك أولًا قبل رفع المنتج." }, { status: 409 });
      if (!DIGITAL_TYPES.has(mimeType)) return NextResponse.json({ message: "نوع الملف غير مدعوم. استخدم الصور أو الفيديو أو الصوت أو PDF أو ZIP أو ملفات Office أو TXT وCSV." }, { status: 400 });
      maxSize = MAX_DIGITAL_PRODUCT_BYTES;
      bucket = "digital-products";
      const extension = (name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10) || "bin";
      objectPath = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
      await ensurePrivateStorageBucket(bucket, maxSize);
    } else if (kind === "delivery") {
      if (user.role !== "PROVIDER" || user.status !== "ACTIVE") return NextResponse.json({ message: "رفع ملفات التسليم لمقدمي الخدمات المعتمدين فقط." }, { status: 403 });
      if (!DELIVERY_TYPES.has(mimeType)) return NextResponse.json({ message: "نوع الملف غير مدعوم. استخدم الصور أو الفيديو أو PDF أو ZIP أو ملفات Word وExcel." }, { status: 400 });
      const orderId = typeof body?.orderId === "string" ? body.orderId : "";
      const order = await prisma.order.findFirst({ where: { id: orderId, providerId: user.id, status: { in: ["IN_PROGRESS", "REVISION_REQUESTED"] } }, select: { id: true } });
      if (!order) return NextResponse.json({ message: "الطلب غير متاح للتسليم من هذا الحساب." }, { status: 403 });
      maxSize = MAX_DELIVERY_BYTES;
      bucket = "order-deliveries";
      const extension = mimeType === "image/jpeg" ? "jpg" : mimeType === "video/quicktime" ? "mov" : (mimeType.split("/")[1] || "bin").replace("vnd.openxmlformats-officedocument.wordprocessingml.document", "docx").replace("vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx");
      objectPath = `${order.id}/${user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    } else {
      return NextResponse.json({ message: "نوع الرفع غير صحيح." }, { status: 400 });
    }

    if (size > maxSize) return NextResponse.json({ message: `حجم الملف أكبر من الحد المسموح (${Math.round(maxSize / 1024 / 1024)} MB).` }, { status: 413 });
    const signed = await createStorageUpload(bucket, objectPath);
    return NextResponse.json({
      ...signed, bucket, mimeType, maxSize,
      publicUrl: kind === "service" ? serviceMediaPublicUrl(objectPath) : null,
    });
  } catch (error) {
    console.error("UPLOAD_SIGN_ERROR", error);
    return NextResponse.json({ message: "تعذر تجهيز رفع الملف. تحقق من إعدادات التخزين." }, { status: 500 });
  }
}
