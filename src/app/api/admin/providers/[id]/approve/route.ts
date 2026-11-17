import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const approvalSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().trim().max(1000).optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const admin = await getCurrentUser();

    if (!admin || admin.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, message: "غير مسموح لك بتنفيذ هذا الإجراء" },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();
    const validation = approvalSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: "بيانات المراجعة غير صحيحة" },
        { status: 400 }
      );
    }

    const { action, reason } = validation.data;

    if (action === "REJECT" && !reason) {
      return NextResponse.json(
        { success: false, message: "يجب كتابة سبب رفض الحساب" },
        { status: 400 }
      );
    }

    const provider = await prisma.user.findUnique({
      where: { id },
    });

    if (!provider || provider.role !== "PROVIDER") {
      return NextResponse.json(
        { success: false, message: "مقدم الخدمة غير موجود" },
        { status: 404 }
      );
    }

    if (provider.status !== "PENDING") {
      return NextResponse.json(
        { success: false, message: "تمت مراجعة هذا الحساب من قبل" },
        { status: 409 }
      );
    }

    const updatedProvider = await prisma.user.update({
      where: { id },
      data: {
        status: action === "APPROVE" ? "ACTIVE" : "SUSPENDED",
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action:
          action === "APPROVE"
            ? "PROVIDER_APPROVED"
            : "PROVIDER_REJECTED",
        entityType: "User",
        entityId: provider.id,
        details: JSON.stringify({
          providerEmail: provider.email,
          reason: action === "REJECT" ? reason : null,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message:
        action === "APPROVE"
          ? "تمت الموافقة على مقدم الخدمة"
          : "تم رفض حساب مقدم الخدمة",
      provider: updatedProvider,
    });
  } catch (error) {
    console.error("PROVIDER_APPROVAL_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء مراجعة الحساب" },
      { status: 500 }
    );
  }
      }
