import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { reviewPayment } from "@/lib/escrow";

const reviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().trim().max(1000).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "SUPER_ADMIN" || user.status !== "ACTIVE") {
      return NextResponse.json({ message: "هذه العملية متاحة للإدارة النشطة فقط." }, { status: 403 });
    }

    const { id } = await params;
    const parsed = reviewSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: "بيانات المراجعة غير صحيحة." }, { status: 400 });
    }

    const { status, reviewNote } = parsed.data;
    if (status === "REJECTED" && !reviewNote) {
      return NextResponse.json({ message: "يرجى كتابة سبب رفض الدفع." }, { status: 400 });
    }

    await reviewPayment(id, user.id, status, reviewNote);

    return NextResponse.json({
      message: status === "APPROVED"
        ? "تم اعتماد إثبات التحويل وتسجيل إجمالي الطلب كرصيد محجوز محاسبيًا. لا يوجد حساب ضمان منفصل ولا صرف تلقائي."
        : "تم رفض إثبات التحويل وإعادة الطلب إلى انتظار الدفع.",
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "PAYMENT_NOT_FOUND") return NextResponse.json({ message: "عملية الدفع غير موجودة." }, { status: 404 });
    if (["PAYMENT_REVIEW_CONFLICT", "ESCROW_ALREADY_EXISTS"].includes(code)) {
      return NextResponse.json({ message: "تمت مراجعة الدفع بالفعل أو يوجد سجل حجز لهذا الطلب." }, { status: 409 });
    }
    if (code === "PAYMENT_AMOUNT_MISMATCH" || code === "ORDER_TOTAL_INVARIANT") {
      return NextResponse.json({ message: "تعذر اعتماد الدفع بسبب عدم تطابق المبلغ أو تقسيم إجمالي الطلب. أوقفنا العملية للمراجعة." }, { status: 400 });
    }
    console.error("Payment review error:", error);
    return NextResponse.json({ message: "حدث خطأ أثناء مراجعة الدفع." }, { status: 500 });
  }
}
