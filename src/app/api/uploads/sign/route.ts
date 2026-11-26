import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createStorageUpload, serviceMediaPublicUrl, storageReady } from "@/lib/storage";
export const dynamic = "force-dynamic";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 40 * 1024 * 1024;
const MAX_DELIVERY_BYTES = 50 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg","image/png","image/webp"]);
const VIDEO_TYPES = new Set(["video/mp4","video/webm","video/quicktime"]);
const DELIVERY_TYPES = new Set([...IMAGE_TYPES, ...VIDEO_TYPES, "application/pdf", "application/zip", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]);
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "يجب تسجيل الدخول أولاً." }, { status: 401 });
    if (!storageReady()) return NextResponse.json({ message: "التخزين غير مهيأ بعد. أضف إعدادات Supabase في Vercel." }, { status: 503 });
    const body = await request.json();
    const kind = body?.kind;
    const name = typeof body?.name === "string" ? body.name : "";
    const mimeType = typeof body?.mimeType === "string" ? body.mimeType : "";
    const size = Number(body?.size);
    if (!Number.isSafeInteger(size) || size <= 0 || !name || name.length > 180) return NextResponse.json({ message: "بيانات الملف غير صحيحة." }, { status: 400 });
    let bucket: string;
    let maxSize: number;
    let objectFolder = "";
    if (kind === "service") {
      if (user.role !== "PROVIDER" || user.status !== "ACTIVE") return NextResponse.json({ message: "رفع ملفات الخدمات لمقدمي الخدمات المعتمدين فقط." }, { status: 403 });
      if (!IMAGE_TYPES.has(mimeType) && !VIDEO_TYPES.has(mimeType)) return NextResponse.json({ message: "الصيغ المسموحة: JPG وPNG وWEBP وMP4 وWEBM وMOV." }, { status: 400 });
      maxSize = VIDEO_TYPES.has(mimeType) ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
      bucket = "service-media";
    } else if (kind === "provider-portfolio") {
      if (!((user.role === "PROVIDER" && user.status === "PENDING") || (user.role === "CUSTOMER" && user.status === "ACTIVE"))) return NextResponse.json({ message: "رفع نماذج الأعمال متاح للمتقدمين فقط." }, { status: 403 });
      if (!IMAGE_TYPES.has(mimeType) && !VIDEO_TYPES.has(mimeType)) return NextResponse.json({ message: "الصيغ المسموحة: JPG وPNG وWEBP وMP4 وWEBM وMOV." }, { status: 400 });
      maxSize = VIDEO_TYPES.has(mimeType) ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
      bucket = "provider-verification";
    } else if (kind === "provider-verification") {
      if (!((user.role === "PROVIDER" && user.status === "PENDING") || (user.role === "CUSTOMER" && user.status === "ACTIVE"))) return NextResponse.json({ message: "رفع مستندات التحقق متاح للمتقدمين المؤهلين فقط." }, { status: 403 });
      if (!IMAGE_TYPES.has(mimeType)) return NextResponse.json({ message: "مستند التحقق يجب أن يكون صورة JPG أو PNG أو WEBP." }, { status: 400 });
      maxSize = MAX_IMAGE_BYTES;
      bucket = "provider-verification";
    } else if (kind === "receipt") {
      if (user.role !== "CUSTOMER" || user.status !== "ACTIVE") return NextResponse.json({ message: "رفع الإيصال متاح للعملاء فقط." }, { status: 403 });
      if (!IMAGE_TYPES.has(mimeType)) return NextResponse.json({ message: "إيصال الدفع يجب أن يكون صورة JPG أو PNG أو WEBP." }, { status: 400 });
      maxSize = MAX_IMAGE_BYTES;
      bucket = "payment-receipts";
    } else if (kind === "delivery") {
      if (user.role !== "PROVIDER" || user.status !== "ACTIVE") return NextResponse.json({ message: "رفع ملفات التسليم لمقدمي الخدمات المعتمدين فقط." }, { status: 403 });
      if (!DELIVERY_TYPES.has(mimeType)) return NextResponse.json({ message: "نوع الملف غير مدعوم. استخدم الصور أو الفيديو أو PDF أو ZIP أو ملفات Word وExcel." }, { status: 400 });
      const orderId = typeof body?.orderId === "string" ? body.orderId : "";
      const order = await prisma.order.findFirst({ where: { id: orderId, providerId: user.id, status: { in: ["IN_PROGRESS", "REVISION_REQUESTED"] } }, select: { id: true } });
      if (!order) return NextResponse.json({ message: "الطلب غير متاح للتسليم من هذا الحساب." }, { status: 403 });
      maxSize = MAX_DELIVERY_BYTES;
      bucket = "order-deliveries";
      objectFolder = `${order.id}/${user.id}/`;
    } else return NextResponse.json({ message: "نوع الرفع غير صحيح." }, { status: 400 });
    if (size > maxSize) return NextResponse.json({ message: `حجم الملف أكبر من الحد المسموح (${Math.round(maxSize/1024/1024)} MB).` }, { status: 413 });
    const extension = mimeType === "image/jpeg" ? "jpg" : mimeType === "video/quicktime" ? "mov" : mimeType.split("/")[1];
    const folder = kind === "provider-verification" ? "verification/" : kind === "provider-portfolio" ? "portfolio/" : "";
    const objectPath = kind === "delivery" ? `${objectFolder}${Date.now()}-${crypto.randomUUID()}.${extension}` : `${user.id}/${folder}${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const signed = await createStorageUpload(bucket, objectPath);
    return NextResponse.json({ ...signed, bucket, mimeType, maxSize, publicUrl: kind === "service" ? serviceMediaPublicUrl(objectPath) : null });
  } catch (error) {
    console.error("UPLOAD_SIGN_ERROR", error);
    return NextResponse.json({ message: "تعذر تجهيز رفع الملف. تحقق من إعدادات التخزين." }, { status: 500 });
  }
}
