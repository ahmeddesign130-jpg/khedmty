import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const approvalSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().max(1000).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentUser();

    if (!admin || admin.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { message: "هذه العملية متاحة للإدارة فقط." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = approvalSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "بيانات المراجعة غير صحيحة." },
        { status: 400 }
      );
    }

    const { action, reason } = parsed.data;

    if (action === "REJECT" && !reason?.trim()) {
      return NextResponse.json(
        { message: "يرجى كتابة سبب رفض الحساب." },
        { status: 400 }
      );
    }

    const provider = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        status: true,
      },
    });

    if (!provider || provider.role !== "PROVIDER") {
      return NextResponse.json(
        { message: "حساب مقدم الخدمة غير موجود." },
        { status: 404 }
      );
    }

    if (provider.status !== "PENDING") {
      return NextResponse.json(
        { message: "تمت مراجعة هذا الحساب من قبل." },
        { status: 409 }
      );
    }

    const newStatus = action === "APPROVE" ? "ACTIVE" : "SUSPENDED";

    const updatedProvider = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: { status: newStatus },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          status: true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action:
            action === "APPROVE"
              ? "PROVIDER_APPROVED"
              : "PROVIDER_REJECTED",
          targetId: provider.id,
          details:
            action === "APPROVE"
              ? "تم اعتماد حساب مقدم الخدمة."
              : `سبب رفض الحساب: ${reason?.trim()}`,
        },
      });

      return updated;
    });

    return NextResponse.json({
      message:
        action === "APPROVE"
          ? "تم اعتماد حساب مقدم الخدمة بنجاح."
          : "تم رفض حساب مقدم الخدمة.",
      provider: updatedProvider,
    });
  } catch (error) {
    console.error("Provider approval error:", error);

    return NextResponse.json(
      { message: "حدث خطأ أثناء مراجعة حساب مقدم الخدمة." },
      { status: 500 }
    );
  }
}
