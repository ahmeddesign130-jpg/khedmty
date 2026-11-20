import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { markDisputeUnderReview } from "@/lib/escrow";

const schema = z.object({ status: z.literal("UNDER_REVIEW") });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "SUPER_ADMIN" || admin.status !== "ACTIVE") {
      return NextResponse.json({ message: "هذه العملية متاحة للإدارة النشطة فقط." }, { status: 403 });
    }
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ message: "حالة المراجعة غير صحيحة." }, { status: 400 });
    const { id } = await params;
    await markDisputeUnderReview(id, admin.id);
    return NextResponse.json({ message: "تم تسجيل بدء مراجعة النزاع." });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "DISPUTE_NOT_FOUND") return NextResponse.json({ message: "النزاع غير موجود." }, { status: 404 });
    if (code === "DISPUTE_REVIEW_CONFLICT") return NextResponse.json({ message: "بدأت مراجعة النزاع بالفعل أو تم حسمه." }, { status: 409 });
    console.error("Dispute review error:", error);
    return NextResponse.json({ message: "حدث خطأ أثناء بدء مراجعة النزاع." }, { status: 500 });
  }
}
