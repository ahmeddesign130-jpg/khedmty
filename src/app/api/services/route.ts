import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const serviceSchema = z.object({
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().min(20).max(5000),
  price: z.number().int().positive().max(100000000),
  mediaUrls: z.array(z.string().url()).max(8).default([]),
});

function generateServiceNo() {
  return `KH-SRV-${crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "يجب تسجيل الدخول أولاً." }, { status: 401 });
    }
    if (user.role !== "CUSTOMER" || user.status !== "ACTIVE") {
      return NextResponse.json({ success: false, message: "تصفح الخدمات متاح للعملاء النشطين فقط." }, { status: 403 });
    }

    const serviceNo = request.nextUrl.searchParams.get("serviceNo")?.trim().toUpperCase();
    const services = await prisma.service.findMany({
      where: {
        status: "APPROVED",
        ...(serviceNo ? { serviceNo: { equals: serviceNo } } : {}),
      },
      include: { provider: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, services });
  } catch (error) {
    console.error("GET_SERVICES_ERROR:", error);
    return NextResponse.json({ success: false, message: "حدث خطأ أثناء تحميل الخدمات." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, message: "يجب تسجيل الدخول أولاً." }, { status: 401 });
    if (user.role !== "PROVIDER" || user.status !== "ACTIVE") {
      return NextResponse.json({ success: false, message: "هذه الخاصية لمقدمي الخدمات المعتمدين فقط." }, { status: 403 });
    }

    const validation = serviceSchema.safeParse(await request.json());
    if (!validation.success) {
      return NextResponse.json({ success: false, message: "راجع بيانات الخدمة المدخلة.", errors: validation.error.flatten() }, { status: 400 });
    }

    const storageBase = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
    if (validation.data.mediaUrls.length > 0) {
      if (!storageBase) return NextResponse.json({ success: false, message: "إعداد التخزين غير مكتمل." }, { status: 503 });
      const expectedPrefix = `${storageBase}/storage/v1/object/public/service-media/${user.id}/`;
      const ownedMedia = validation.data.mediaUrls.every((rawUrl) => {
        try {
          const url = new URL(rawUrl);
          return url.origin === new URL(storageBase).origin && rawUrl.startsWith(expectedPrefix) && !url.pathname.includes("..");
        } catch {
          return false;
        }
      });
      if (!ownedMedia) return NextResponse.json({ success: false, message: "ملفات الخدمة يجب أن تكون مرفوعة من حسابك إلى تخزين خِدمتي." }, { status: 400 });
    }

    const service = await prisma.$transaction(async (tx) => {
      const created = await tx.service.create({
        data: { serviceNo: generateServiceNo(), ...validation.data, providerId: user.id, status: "PENDING_REVIEW" },
      });
      await tx.auditLog.create({
        data: { actorId: user.id, action: "SERVICE_SUBMITTED", targetId: created.id, details: `تم إرسال الخدمة ${created.serviceNo} للمراجعة` },
      });
      return created;
    });

    return NextResponse.json({ success: true, message: "تم إرسال الخدمة إلى الإدارة للمراجعة.", service }, { status: 201 });
  } catch (error) {
    console.error("CREATE_SERVICE_ERROR:", error);
    return NextResponse.json({ success: false, message: "حدث خطأ أثناء إنشاء الخدمة." }, { status: 500 });
  }
}
