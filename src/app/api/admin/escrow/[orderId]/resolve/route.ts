import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { resolveEscrow } from "@/lib/escrow";

const schema = z.object({
  decision: z.enum(["RELEASE_TO_PROVIDER", "REFUND_CUSTOMER"]),
  resolutionNote: z.string().trim().min(10).max(1500),
  externalReference: z.string().trim().min(3).max(120),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "SUPER_ADMIN" || admin.status !== "ACTIVE") {
      return NextResponse.json({ message: "تسجيل الصرف أو الاسترداد متاح للإدارة النشطة فقط." }, { status: 403 });
    }

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: "أدخل قرار الإدارة وسببًا واضحًا ومرجع التحويل الخارجي." }, { status: 400 });
    }

    const { orderId } = await params;
    const result = await resolveEscrow(
      orderId,
      admin.id,
      parsed.data.decision,
      parsed.data.resolutionNote,
      parsed.data.externalReference
    );

    return NextResponse.json({
      message: parsed.data.decision === "RELEASE_TO_PROVIDER"
        ? "تم تسجيل صرف مستحق مقدم الخدمة في السجل الداخلي بعد إدخال مرجع التحويل اليدوي."
        : "تم تسجيل الاسترداد في السجل الداخلي بعد إدخال مرجع التحويل اليدوي.",
      result,
      notice: "هذا الإجراء لا ينفذ تحويلًا ماليًا؛ يجب أن يكون التحويل الخارجي قد نُفذ بالفعل قبل تسجيله.",
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "ESCROW_NOT_FOUND") return NextResponse.json({ message: "لا يوجد سجل حجز لهذا الطلب." }, { status: 404 });
    if (code === "ESCROW_RESOLUTION_FORBIDDEN") return NextResponse.json({ message: "لا يسمح بالصرف إلا بعد تأكيد العميل، ولا يسمح بالاسترداد إلا بعد فتح نزاع ومراجعته." }, { status: 403 });
    if (code === "ESCROW_RESOLUTION_CONFLICT" || code.includes("Unique constraint")) {
      return NextResponse.json({ message: "تم تسجيل قرار مالي لهذا الطلب بالفعل. لا يمكن تكرار الصرف أو الاسترداد." }, { status: 409 });
    }
    if (code === "ESCROW_AMOUNT_INVARIANT") return NextResponse.json({ message: "توزيع المبلغ غير متطابق؛ أوقفنا التسجيل للمراجعة." }, { status: 400 });
    console.error("Escrow resolution error:", error);
    return NextResponse.json({ message: "حدث خطأ أثناء تسجيل القرار المالي." }, { status: 500 });
  }
}
