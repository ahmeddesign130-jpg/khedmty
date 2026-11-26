import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isValidServiceCategory } from "@/lib/service-categories";
import { getStorageObjectInfo } from "@/lib/storage-security";
import { enforceRateLimit, enforceSameOrigin } from "@/lib/security";

export const dynamic = "force-dynamic";

const serviceSchema = z.object({
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().min(20).max(5000),
  category: z.string().trim().min(2).max(60),
  subcategory: z.string().trim().min(2).max(80),
  requirements: z.array(z.string().trim().min(3).max(180)).max(12).default([]),
  price: z.number().int().positive().max(100000000),
  mediaUrls: z.array(z.string().url()).max(8).default([]),
});

function generateServiceNo() {
  return `KH-SRV-${crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
}

export async function GET(request: NextRequest) {
  try {
    if (!enforceSameOrigin(request)) return NextResponse.json({ success: false, message: "الطلب غير مسموح." }, { status: 403 });
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, message: "يجب تسجيل الدخول أولاً." }, { status: 401 });
    if (user.role !== "CUSTOMER" || user.status !== "ACTIVE") return NextResponse.json({ success: false, message: "تصفح الخدمات متاح للعملاء النشطين فقط." }, { status: 403 });

    const params = request.nextUrl.searchParams;
    const category = params.get("category")?.trim();
    const subcategory = params.get("subcategory")?.trim();
    const minPriceRaw = params.get("minPrice");
    const maxPriceRaw = params.get("maxPrice");
    const minPrice = minPriceRaw && /^\d+$/.test(minPriceRaw) ? Number(minPriceRaw) : undefined;
    const maxPrice = maxPriceRaw && /^\d+$/.test(maxPriceRaw) ? Number(maxPriceRaw) : undefined;
    const serviceNo = params.get("serviceNo")?.trim().toUpperCase();
    const search = params.get("q")?.trim().slice(0, 80);
    const services = await prisma.service.findMany({
      where: {
        status: "APPROVED",
        ...(category ? { category } : {}),
        ...(subcategory ? { subcategory } : {}),
        ...(minPrice !== undefined || maxPrice !== undefined ? { price: { ...(minPrice !== undefined ? { gte: minPrice } : {}), ...(maxPrice !== undefined ? { lte: maxPrice } : {}) } } : {}),
        ...(serviceNo ? { serviceNo: { equals: serviceNo } } : {}),
        ...(search ? { OR: [{ title: { contains: search, mode: "insensitive" } }, { description: { contains: search, mode: "insensitive" } }, { serviceNo: { contains: search, mode: "insensitive" } }] } : {}),
      },
      select: { id: true, serviceNo: true, title: true, description: true, category: true, subcategory: true, requirements: true, price: true, mediaUrls: true, provider: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ success: true, services }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    console.error("GET_SERVICES_ERROR:", error);
    return NextResponse.json({ success: false, message: "حدث خطأ أثناء تحميل الخدمات." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, message: "يجب تسجيل الدخول أولاً." }, { status: 401 });
    if (user.role !== "PROVIDER" || user.status !== "ACTIVE") return NextResponse.json({ success: false, message: "هذه الخاصية لمقدمي الخدمات المعتمدين فقط." }, { status: 403 });
    if (!await enforceRateLimit(request, "service-create", user.id, 10, 3600)) return NextResponse.json({ success: false, message: "تجاوزت عدد محاولات إضافة الخدمات. حاول لاحقًا." }, { status: 429 });
    const validation = serviceSchema.safeParse(await request.json());
    if (!validation.success) return NextResponse.json({ success: false, message: "راجع بيانات الخدمة المدخلة.", errors: validation.error.flatten() }, { status: 400 });
    if (!isValidServiceCategory(validation.data.category, validation.data.subcategory)) return NextResponse.json({ success: false, message: "اختار تخصصًا صحيحًا من القائمة." }, { status: 400 });

    const storageBase = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
    if (validation.data.mediaUrls.length > 0) {
      if (!storageBase) return NextResponse.json({ success: false, message: "إعداد التخزين غير مكتمل." }, { status: 503 });
      const expectedPrefix = `${storageBase}/storage/v1/object/public/service-media/${user.id}/`;
      const ownedMedia = validation.data.mediaUrls.every((rawUrl) => {
        try { const url = new URL(rawUrl); return url.origin === new URL(storageBase).origin && rawUrl.startsWith(expectedPrefix) && !url.pathname.includes(".."); }
        catch { return false; }
      });
      if (!ownedMedia) return NextResponse.json({ success: false, message: "ملفات الخدمة يجب أن تكون مرفوعة من حسابك إلى تخزين خِدمتي." }, { status: 400 });
    }

    const { mediaUrls, ...details } = validation.data;
    const service = await prisma.$transaction(async (tx) => {
      const created = await tx.service.create({ data: { ...details, mediaUrls, serviceNo: generateServiceNo(), providerId: user.id, status: "PENDING_REVIEW" } });
      await tx.auditLog.create({ data: { actorId: user.id, action: "SERVICE_SUBMITTED", targetId: created.id, details: `تم إرسال الخدمة ${created.serviceNo} للمراجعة` } });
      return created;
    });
    return NextResponse.json({ success: true, message: "تم إرسال الخدمة إلى الإدارة للمراجعة.", service }, { status: 201 });
  } catch (error) {
    console.error("CREATE_SERVICE_ERROR:", error);
    return NextResponse.json({ success: false, message: "حدث خطأ أثناء إنشاء الخدمة." }, { status: 500 });
  }
}