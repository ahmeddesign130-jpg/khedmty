import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createStorageUpload, storageReady } from "@/lib/storage";
export const dynamic = "force-dynamic";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 40 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg","image/png","image/webp"]);
const VIDEO_TYPES = new Set(["video/mp4","video/webm","video/quicktime"]);
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
    if (kind === "service") {
      if (user.role !== "PROVIDER" || user.status !== "ACTIVE") return NextResponse.json({ message: "رفع ملفات الخدمات لمقدمي الخدمات المعتمدين فقط." }, { status: 403 });
      if (!IMAGE_TYPES.has(mimeType) && !VIDEO_TYPES.has(mimeType)) return NextResponse.json({ message: "الصيغ المسموحة: JPG وPNG وWEBP وMP4 وWEBM وMOV." }, { status: 400 });
      maxSize = VIDEO_TYPES.has(mimeType) ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
      bucket = "service-media";
    } else if (kind === "receipt") {
      if (user.role !== "CUSTOMER" || user.status !== "ACTIVE") return NextResponse.json({ message: "رفع الإيصال متاح للعملاء فقط." }, { status: 403 });
      if (!IMAGE_TYPES.has(mimeType)) return NextResponse.json({ message: "إيصال الدفع يجب أن يكون صورة JPG أو PNG أو WEBP." }, { status: 400 });
      maxSize = MAX_IMAGE_BYTES;
      bucket = "payment-receipts";
    } else return NextResponse.json({ message: "نوع الرفع غير صحيح." }, { status: 400 });
    if (size > maxSize) return NextResponse.json({ message: `حجم الملف أكبر من الحد المسموح (${Math.round(maxSize/1024/1024)} MB).` }, { status: 413 });
    const extension = mimeType === "image/jpeg" ? "jpg" : mimeType === "video/quicktime" ? "mov" : mimeType.split("/")[1];
    const objectPath = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const signed = await createStorageUpload(bucket, objectPath);
    return NextResponse.json({ ...signed, bucket, mimeType, maxSize });
  } catch (error) {
    console.error("UPLOAD_SIGN_ERROR", error);
    return NextResponse.json({ message: "تعذر تجهيز رفع الملف. تحقق من إعدادات التخزين." }, { status: 500 });
  }
}
