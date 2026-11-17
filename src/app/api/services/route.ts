import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const serviceSchema = z.object({
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().min(20).max(5000),
  price: z.number().int().positive(),
});

function generateServiceNo() {
  return `KH-SRV-${crypto.randomUUID()
    .replace(/-/g, "")
    .slice(0, 12)
    .toUpperCase()}`;
}

// عرض الخدمات المعتمدة
export async function GET() {
  try {
    const services = await prisma.service.findMany({
      where: {
        status: "APPROVED",
      },
      include: {
        provider: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      services,
    });
  } catch (error) {
    console.error("GET_SERVICES_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء تحميل الخدمات" },
      { status: 500 }
    );
  }
}

// إنشاء خدمة جديدة
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
    const validation = serviceSchema.safeParse(body);

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

    const service = await prisma.service.create({
      data: {
        serviceNo: generateServiceNo(),
        title: validation.data.title,
        description: validation.data.description,
        price: validation.data.price,
        providerId: user.id,
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
