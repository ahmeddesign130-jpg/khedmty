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

    if (action !== "APPROVE" && action !== "REJECT") {
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

    const provider = await prisma.user.findUnique({ where: { id } });

    if (!provider || provider.role !== "PROVIDER") {
      return NextResponse.json(
        { error: "مقدم الخدمة غير موجود." },
        { status: 404 }
      );
    }

    const latestSubmission = await prisma.auditLog.findFirst({
      where: { targetId: id, action: "PROVIDER_APPLICATION_SUBMITTED" },
      orderBy: { createdAt: "desc" },
      select: { details: true, createdAt: true },
    });
    const latestDecision = await prisma.auditLog.findFirst({
      where: { targetId: id, action: { in: ["PROVIDER_APPLICATION_REJECTED", "PROVIDER_APPLICATION_APPROVED"] } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    const { decryptProviderApplication } = await import("@/lib/provider-application");
    const verification = latestSubmission?.details ? decryptProviderApplication(latestSubmission.details) : null;
    if (!verification?.dateOfBirth || !verification.idFrontPath?.startsWith(id + "/verification/") || !verification.idBackPath?.startsWith(id + "/verification/") || (latestDecision && latestSubmission && latestDecision.createdAt > latestSubmission.createdAt)) {
      return NextResponse.json({ error: "يجب استكمال ومراجعة بيانات الهوية قبل اعتماد الحساب." }, { status: 409 });
    }

    if (provider.status !== "PENDING") {
      return NextResponse.json(
        { error: "تمت مراجعة هذا الحساب من قبل." },
        { status: 409 }
      );
    }

    await prisma.$transaction(async (tx) => {
      const update = await tx.user.updateMany({
        where: { id, role: "PROVIDER", status: "PENDING" },
        data: { status: action === "APPROVE" ? "ACTIVE" : "SUSPENDED" },
      });

      if (update.count !== 1) {
        throw new Error("REVIEW_CONFLICT");
      }

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: action === "APPROVE" ? "PROVIDER_APPROVED" : "PROVIDER_REJECTED",
          targetId: id,
          details: action === "REJECT" ? reason : "تمت الموافقة",
        },
      });
    });

    return NextResponse.json({
      success: true,
      message:
        action === "APPROVE"
          ? "تمت الموافقة على مقدم الخدمة."
          : "تم رفض مقدم الخدمة.",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "REVIEW_CONFLICT") {
      return NextResponse.json(
        { error: "تمت مراجعة هذا الحساب بالفعل بواسطة مسؤول آخر." },
        { status: 409 }
      );
    }

    console.error("Provider approval error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء مراجعة مقدم الخدمة." },
      { status: 500 }
    );
  }
}
