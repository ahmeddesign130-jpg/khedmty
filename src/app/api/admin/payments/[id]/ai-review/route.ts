import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createStorageDownload, storageReady } from "@/lib/storage";

export const dynamic = "force-dynamic";

type ResponsesApiPayload = {
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
};
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "SUPER_ADMIN") return NextResponse.json({ message: "الفحص متاح للإدارة فقط." }, { status: 403 });
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ message: "فحص الصور بالذكاء الاصطناعي غير مفعّل بعد. أضف OPENAI_API_KEY في إعدادات الخادم." }, { status: 503 });
    if (!storageReady()) return NextResponse.json({ message: "التخزين الخاص غير متاح حالياً." }, { status: 503 });

    const { id } = await params;
    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment || payment.status !== "PENDING_REVIEW" || !payment.receiptUrl || payment.receiptUrl.startsWith("http")) {
      return NextResponse.json({ message: "الإيصال غير متاح للفحص." }, { status: 404 });
    }
    const imageUrl = await createStorageDownload("payment-receipts", payment.receiptUrl);
    if (!imageUrl) return NextResponse.json({ message: "تعذر فتح صورة الإيصال الخاصة." }, { status: 503 });

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        store: false,
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: `حلّل صورة إيصال التحويل بصرياً فقط بحثاً عن مؤشرات واضحة على تركيب أو تعديل الصورة أو توليدها اصطناعياً. لا تحاول إثبات وصول المال ولا تعتمد على رقم أو مبلغ أو تاريخ. أعد JSON فقط بالشكل {"status":"SUSPICIOUS|NEEDS_REVIEW|NO_CLEAR_SIGNS","summary":"ملخص عربي قصير"}. استخدم SUSPICIOUS فقط عند وجود مؤشرات بصرية قوية، وNEEDS_REVIEW عند عدم الحسم أو وجود علامات ضعيفة، وNO_CLEAR_SIGNS عند عدم ظهور مؤشرات واضحة. لا تدّعِ اليقين؛ لا يمكن إثبات أصالة الإيصال من الصورة وحدها.` },
            { type: "input_image", image_url: imageUrl, detail: "high" }
          ]
        }]
      }),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({})) as ResponsesApiPayload;
    if (!response.ok) {
      console.error("RECEIPT_AI_REVIEW_ERROR", response.status, payload);
      return NextResponse.json({ message: "تعذر إجراء الفحص حالياً." }, { status: 502 });
    }
    const outputText = payload.output?.flatMap((item) => item.content ?? []).find((part) => part.type === "output_text")?.text ?? "";
    let parsed: { status?: string; summary?: string };
    try { parsed = JSON.parse(outputText); } catch { parsed = { status: "NEEDS_REVIEW", summary: "لم تُرجع أداة الفحص نتيجة منظمة؛ يلزم فحص يدوي." }; }
    const allowed = new Set(["SUSPICIOUS", "NEEDS_REVIEW", "NO_CLEAR_SIGNS"]);
    const status = allowed.has(String(parsed.status)) ? String(parsed.status) : "NEEDS_REVIEW";
    const summary = String(parsed.summary || "لم يتم تقديم تفاصيل كافية.").slice(0, 1000);
    const saved = await prisma.payment.updateMany({
      where: { id, status: "PENDING_REVIEW" },
      data: { aiReviewStatus: status, aiReviewSummary: summary },
    });
    if (saved.count !== 1) return NextResponse.json({ message: "تغيرت حالة الدفع أثناء الفحص. حدّث الصفحة." }, { status: 409 });
    await prisma.auditLog.create({ data: { actorId: user.id, action: "PAYMENT_AI_IMAGE_REVIEW", targetId: id, details: `${status}: ${summary}` } });
    return NextResponse.json({ status, summary, disclaimer: "مؤشرات بصرية فقط وليست حكماً قاطعاً ولا تحققاً من وصول الأموال." });
  } catch (error) {
    console.error("RECEIPT_AI_REVIEW_ERROR", error);
    return NextResponse.json({ message: "حدث خطأ أثناء فحص صورة الإيصال." }, { status: 500 });
  }
}
