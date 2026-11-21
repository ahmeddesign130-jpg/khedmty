import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const reviewSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().trim().max(1000).optional(),
  finalPrice: z.number().int().positive().max(100000000).optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const admin = await getCurrentUser();

    if (!admin || admin.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, message: "غير مسموح لك بمراجعة الخدمات" },
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

    const { action, reason, finalPrice } = validation.data;

    if (action === "APPROVE" && !finalPrice) {
      return NextResponse.json(
        { success: false, message: "حدد السعر النهائي الذي سيدفعه العميل." },
        { status: 400 }
      );
    }

    if (action === "REJECT" && !reason) {
      return NextResponse.json(
        { success: false, message: "اكتب سبب رفض الخدمة" },
        { status: 400 }
      );
    }

    const service = await prisma.service.findUnique({ where: { id } });

    if (!service) {
      return NextResponse.json(
        { success: false, message: "الخدمة غير موجودة" },
        { status: 404 }
      );
    }

    if (service.status !== "PENDING_REVIEW") {
      return NextResponse.json(
        { success: false, message: "الخدمة ليست قيد المراجعة" },
        { status: 409 }
      );
    }

    const updatedService = await prisma.$transaction(async (tx) => {
      const update = await tx.service.updateMany({
        where: { id, status: "PENDING_REVIEW" },
        data: {
          status: action === "APPROVE" ? "APPROVED" : "REJECTED",
          reviewNote: action === "REJECT" ? reason : null,
          ...(action === "APPROVE" && finalPrice ? { price: finalPrice } : {}),
        },
      });

      if (update.count !== 1) {
        throw new Error("REVIEW_CONFLICT");
      }

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: action === "APPROVE" ? "SERVICE_APPROVED" : "SERVICE_REJECTED",
          targetId: service.id,
          details: JSON.stringify({
            title: service.title,
            reason: action === "REJECT" ? reason : null,
          }),
        },
      });

      return tx.service.findUniqueOrThrow({ where: { id } });
    });

    return NextResponse.json({
      success: true,
      message: action === "APPROVE" ? "تمت الموافقة على الخدمة" : "تم رفض الخدمة",
      service: updatedService,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "REVIEW_CONFLICT") {
      return NextResponse.json(
        { success: false, message: "تمت مراجعة الخدمة بالفعل بواسطة مسؤول آخر" },
        { status: 409 }
      );
    }

    console.error("SERVICE_REVIEW_ERROR:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء مراجعة الخدمة" },
      { status: 500 }
    );
  }
}
