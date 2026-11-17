import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentUser();

    if (!admin || admin.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "غير مسموح لك بتنفيذ هذا الإجراء." },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = await req.json();

    const action = String(body.action || "");
    const reason = String(body.reason || "").trim();

    if (!["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json(
        { error: "الإجراء غير صحيح." },
        { status: 400 }
      );
    }

    if (action === "REJECT" && !reason) {
      return NextResponse.json(
        { error: "يجب كتابة سبب الرفض." },
        { status: 400 }
      );
    }

    const provider = await prisma.user.findUnique({
      where: { id },
    });

    if (!provider || provider.role !== "PROVIDER") {
      return NextResponse.json(
        { error: "مقدم الخدمة غير موجود." },
        { status: 404 }
      );
    }

    if (provider.status !== "PENDING") {
      return NextResponse.json(
        { error: "تمت مراجعة هذا الحساب من قبل." },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: {
          status: action === "APPROVE" ? "ACTIVE" : "SUSPENDED",
        },
      }),

      prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action:
            action === "APPROVE"
              ? "PROVIDER_APPROVED"
              : "PROVIDER_REJECTED",
          targetId: id,
          details: action === "REJECT" ? reason : "تمت الموافقة",
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message:
        action === "APPROVE"
          ? "تمت الموافقة على مقدم الخدمة."
          : "تم رفض مقدم الخدمة.",
    });
  } catch (error) {
    console.error("Provider approval error:", error);

    return NextResponse.json(
      { error: "حدث خطأ أثناء مراجعة مقدم الخدمة." },
      { status: 500 }
    );
  }
            }
