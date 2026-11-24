import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createStorageDownload, storageReady } from "@/lib/storage";
import PaymentReviewForm from "./PaymentReviewForm";

export const dynamic = "force-dynamic";

const paymentStatus: Record<string, string> = {
  PENDING_REVIEW: "قيد المراجعة",
  APPROVED: "تم قبول الدفع",
  REJECTED: "مرفوض",
};
const paymentMethods: Record<string, string> = {
  INSTAPAY: "InstaPay",
  E_AND_MONEY: "e& money",
  ETISALAT_CASH: "Etisalat Cash",
  OTHER: "وسيلة أخرى",
};

async function reviewPayment(formData: FormData) {
  "use server";

  const admin = await getCurrentUser();
  if (!admin || admin.role !== "SUPER_ADMIN") redirect("/login");

  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "");
  const reviewNote = String(formData.get("reviewNote") || "").trim();
  const transferReference = String(formData.get("transferReference") || "").trim();
  const rawTransferDate = String(formData.get("transferDate") || "").trim();
  const transferDate = rawTransferDate ? new Date(rawTransferDate) : null;

  if (
    !id ||
    !["APPROVED", "REJECTED"].includes(status) ||
    reviewNote.length > 1000 ||
    transferReference.length > 120 ||
    (transferDate && Number.isNaN(transferDate.getTime())) ||
    (status === "REJECTED" && !reviewNote)
  ) return;

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { order: true },
  });

  if (
    !payment ||
    payment.status !== "PENDING_REVIEW" ||
    payment.order.status !== "PAYMENT_REVIEW"
  ) return;
  if (status === "APPROVED" && payment.amount !== payment.order.total) return;

  try {
    await prisma.$transaction(async (tx) => {
      // Conditional updates make the review safe against duplicate admin submissions.
      const paymentUpdate = await tx.payment.updateMany({
        where: { id, status: "PENDING_REVIEW" },
        data: {
          status: status as "APPROVED" | "REJECTED",
          reviewNote: reviewNote || null,
          reviewedAt: new Date(),
          transferReference: transferReference || null,
          transferDate,
        },
      });

      if (paymentUpdate.count !== 1) throw new Error("PAYMENT_REVIEW_CONFLICT");

      const orderUpdate = await tx.order.updateMany({
        where: { id: payment.orderId, status: "PAYMENT_REVIEW" },
        data: { status: status === "APPROVED" ? "PAID" : "PENDING_PAYMENT" },
      });

      if (orderUpdate.count !== 1) throw new Error("PAYMENT_REVIEW_CONFLICT");

      await tx.notification.create({
        data: {
          userId: payment.order.customerId,
          title: status === "APPROVED" ? "تم اعتماد الدفع" : "تم رفض إثبات الدفع",
          body: status === "APPROVED"
            ? `تم تأكيد استلام مبلغ الطلب ${payment.order.orderNo}. يمكنك متابعة حالة الطلب من حسابك.`
            : `تم رفض إثبات الدفع للطلب ${payment.order.orderNo}. السبب: ${reviewNote}`,
          href: `/orders/${payment.orderId}`,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: status === "APPROVED" ? "PAYMENT_APPROVED" : "PAYMENT_REJECTED",
          targetId: id,
          details: reviewNote || `مراجعة دفع الطلب ${payment.order.orderNo}`,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "PAYMENT_REVIEW_CONFLICT") return;
    throw error;
  }

  revalidatePath("/admin/payments");
  revalidatePath("/admin/orders");
  revalidatePath(`/orders/${payment.orderId}`);
}

export default async function AdminPaymentsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPER_ADMIN") redirect("/login");

  const payments = await prisma.payment.findMany({
    include: {
      order: {
        include: {
          customer: { select: { displayName: true, email: true } },
          provider: { select: { displayName: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const receiptLinks = await Promise.all(
    payments.map(async (payment) => {
      if (!payment.receiptUrl || !storageReady()) return null;
      // Receipt paths are private object keys, never public or arbitrary URLs.
      if (payment.receiptUrl.startsWith("http")) return null;
      return createStorageDownload("payment-receipts", payment.receiptUrl);
    }),
  );
  const money = (amount: number) => `${amount.toLocaleString("en-US")} EG`;

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <a href="/admin" className="mb-6 inline-block font-bold text-orange-600">
          ← العودة للوحة الإدارة
        </a>
        <h1 className="text-3xl font-black text-slate-900">إدارة المدفوعات</h1>
        <p className="mb-8 mt-2 text-slate-500">راجع الإيصال والمبلغ قبل اعتماد الدفع.</p>

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">إجمالي المدفوعات</p>
            <p className="mt-2 text-2xl font-black">{payments.length}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">قيد المراجعة</p>
            <p className="mt-2 text-2xl font-black text-orange-600">
              {payments.filter((payment) => payment.status === "PENDING_REVIEW").length}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">مقبولة</p>
            <p className="mt-2 text-2xl font-black text-green-600">
              {payments.filter((payment) => payment.status === "APPROVED").length}
            </p>
          </div>
        </div>

        {payments.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center">لا توجد مدفوعات حتى الآن.</div>
        ) : (
          <div className="space-y-4">
            {payments.map((payment, index) => (
              <section key={payment.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <p className="text-xs text-slate-400">رقم الطلب</p>
                    <p className="mt-1 font-black">{payment.order.orderNo}</p>
                  </div>
                  <span className="rounded-full bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700">
                    {paymentStatus[payment.status]}
                  </span>
                </div>

                <div className="grid gap-4 py-5 sm:grid-cols-2">
                  <div>
                    <p className="font-bold">العميل</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {payment.order.customer.displayName} — {payment.order.customer.email}
                    </p>
                  </div>
                  <div>
                    <p className="font-bold">مقدم الخدمة</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {payment.order.provider.displayName} — {payment.order.provider.email}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-slate-500">وسيلة الدفع</p>
                    <p className="mt-1 font-bold">{paymentMethods[payment.method] || payment.method}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">المبلغ</p>
                    <p className="mt-1 font-black text-orange-600">{money(payment.amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">المطلوب</p>
                    <p className="mt-1 font-bold">{money(payment.order.total)}</p>
                  </div>
                </div>

                {receiptLinks[index] ? (
                  <a
                    href={receiptLinks[index] || undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-block rounded-xl bg-orange-50 px-4 py-3 text-sm font-bold text-orange-700"
                  >
                    فتح صورة الإيصال الخاصة
                  </a>
                ) : payment.receiptUrl ? (
                  <p className="mt-4 text-sm text-red-600">
                    تعذر إنشاء رابط الإيصال؛ تحقق من إعدادات التخزين.
                  </p>
                ) : null}

                {payment.transferReference && <p className="mt-3 text-sm text-slate-600">الرقم المرجعي الذي راجعته الإدارة: <strong dir="ltr">{payment.transferReference}</strong></p>}
                {payment.transferDate && <p className="mt-1 text-sm text-slate-600">تاريخ التحويل الذي راجعته الإدارة: {payment.transferDate.toLocaleString("en-GB")}</p>}
                {payment.reviewNote && (
                  <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm">
                    ملاحظة الإدارة: {payment.reviewNote}
                  </p>
                )}

                {payment.status === "PENDING_REVIEW" && (
                  <PaymentReviewForm paymentId={payment.id} action={reviewPayment} hasReceipt={Boolean(payment.receiptUrl)} aiAnalysis={{
                    status: payment.aiReceiptStatus,
                    amount: payment.aiReceiptAmount,
                    confidence: payment.aiReceiptConfidence,
                    notes: payment.aiReceiptNotes,
                    checkedAt: payment.aiReceiptCheckedAt?.toISOString() || null,
                  }} />
                )}

                <p className="mt-4 text-xs text-slate-400">
                  تاريخ الإرسال: {payment.createdAt.toLocaleString("en-GB")}
                </p>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
