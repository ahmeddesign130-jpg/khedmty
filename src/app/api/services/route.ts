import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const createServiceSchema = z.object({
  categoryId: z.string().min(1, "يجب اختيار القسم"),
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().min(20).max(5000),
  priceMinor: z.number().int().positive(),
  deliveryDays: z.number().int().min(1).max(90),
  revisions: z.number().int().min(0).max(20).default(1),
});

function generateServiceCode() {
  const random = crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
  return `KH-SRV-${random}`;
}

// عرض الخدمات المعتمدة للعملاء
export async function GET() {
  try {
    const services = await prisma.service.findMany({
      where: {
        status: "APPROVED",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      services,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء تحميل الخدمات" },
      { status: 500 }
    );
  }
}

// إضافة خدمة جديدة
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "يجب تسجيل الدخول أولاً" },
        { status: 401 }
      );
    }

    if (user.role !== "PROVIDER") {
      return NextResponse.json(
        { success: false, message: "هذه الخاصية لمقدمي الخدمات فقط" },
        { status: 403 }
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, message: "حسابك لم تتم الموافقة عليه بعد" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = createServiceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "راجع بيانات الخدمة المدخلة",
          errors: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, message: "القسم المحدد غير موجود" },
        { status: 400 }
      );
    }

    const service = await prisma.service.create({
      data: {
        publicCode: generateServiceCode(),
        providerId: user.id,
        categoryId: data.categoryId,
        title: data.title,
        description: data.description,
        priceMinor: data.priceMinor,
        deliveryDays: data.deliveryDays,
        revisions: data.revisions,
        status: "PENDING_REVIEW",
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "تم إرسال الخدمة إلى الإدارة للمراجعة",
        service,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("CREATE_SERVICE_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء إنشاء الخدمة" },
      { status: 500 }
    );
  }
}
