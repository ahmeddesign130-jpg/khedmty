
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const reviewSchema = z.object({
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
    const validation = reviewSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: "بيانات المراجعة غير صحيحة" },
        { status: 400 }
      );
    }

    const { action, reason } = validation.data;

    if (action === "REJECT" && !reason) {
      return NextResponse.json(
        { success: false, message: "يجب كتابة سبب رفض الخدمة" },
        { status: 400 }
      );
    }

    const service = await prisma.service.findUnique({
      where: { id },
    });

    if (!service) {
      return NextResponse.json(
        { success: false, message: "الخدمة غير موجودة" },
        { status: 404 }
      );
    }

    if (service.status !== "PENDING_REVIEW") {
      return NextResponse.json(
        { success: false, message: "هذه الخدمة ليست قيد المراجعة" },
        { status: 409 }
      );
    }

    const updatedService = await prisma.service.update({
      where: { id },
      data: {
        status: action === "APPROVE" ? "APPROVED" : "REJECTED",
        rejectionReason: action === "REJECT" ? reason : null,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action:
          action === "APPROVE"
            ? "SERVICE_APPROVED"
            : "SERVICE_REJECTED",
        entityType: "Service",
        entityId: service.id,
        details: JSON.stringify({
          serviceTitle: service.title,
          reason: action === "REJECT" ? reason : null,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message:
        action === "APPROVE"
          ? "تمت الموافقة على الخدمة"
          : "تم رفض الخدمة",
      service: updatedService,
    });
  } catch (error) {
    console.error("SERVICE_REVIEW_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء مراجعة الخدمة" },
      { status: 500 }
    );
  }
}
