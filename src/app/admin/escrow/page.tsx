import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminEscrowActions } from "@/components/admin-escrow-actions";

export const dynamic = "force-dynamic";

const escrowLabels: Record<string, string> = {
  HELD: "محجوز محاسبيًا",
  DISPUTED: "متوقف بسبب نزاع",
  RELEASED: "تم تسجيل الصرف اليدوي",
  REFUNDED: "تم تسجيل الاسترداد اليدوي",
};
const disputeLabels: Record<string, string> = {
  OPEN: "مفتوح",
  UNDER_REVIEW: "قيد مراجعة الإدارة",
  RESOLVED: "تم الحسم",
};
const ledgerLabels: Record<string, string> = {
  HOLD: "تسجيل مبلغ محجوز",
  PROVIDER_RELEASE: "صرف مستحق مقدم الخدمة",
  PLATFORM_FEE: "إثبات عمولة المنصة",
  CUSTOMER_REFUND: "استرداد العميل",
};
const money = (amount: number) => amount.toLocaleString("en-US") + " EG";

export default async function AdminEscrowPage() {
  const admin = await getCurrentUser();
  if (!admin) redirect("/login");
  if (admin.role !== "SUPER_ADMIN" || admin.status !== "ACTIVE") redirect("/account");

  const escrows = await prisma.orderEscrow.findMany({
    include: {
      order: {
        include: {
          customer: { select: { displayName: true, email: true } },
          provider: { select: { displayName: true, email: true } },
          dispute: true,
        },
      },
      ledgerEntries: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const heldCount = escrows.filter((item) => item.status === "HELD").length;
  const disputedCount = escrows.filter((item) => item.status === "DISPUTED").length;

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/admin" className="mb-6 inline-block font-bold text-orange-600">← العودة للوحة الإدارة</Link>
        <h1 className="text-3xl font-black text-slate-900">الحجز المحاسبي والنزاعات</h1>
        <p className="mt-2 leading-7 text-slate-600">تابع المبالغ المعتمدة، وراجع النزاعات، وسجّل الصرف أو الاسترداد بعد تنفيذ التحويل اليدوي والتحقق منه.</p>

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-950">
          <strong>تنبيه مهم:</strong> هذه آلية محاسبية داخل خِدمتي فقط. التحويلات الحالية تصل إلى محفظة استقبال عادية، ولا يوجد حساب ضمان منفصل أو حفظ أموال مرخّص أو تحويل تلقائي. لا تسجل الصرف أو الاسترداد إلا بعد تنفيذ التحويل الخارجي فعليًا والتحقق من مرجعه.
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">أرصدة محجوزة</p><p className="mt-2 text-2xl font-black text-orange-600">{heldCount.toLocaleString("en-US")}</p></div>
          <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">نزاعات مفتوحة</p><p className="mt-2 text-2xl font-black text-amber-700">{disputedCount.toLocaleString("en-US")}</p></div>
        </div>

        {escrows.length === 0 ? (
          <div className="mt-7 rounded-2xl bg-white p-10 text-center">لا توجد سجلات حجز حتى الآن.</div>
        ) : (
          <div className="mt-7 space-y-4">
            {escrows.map((escrow) => (
              <article key={escrow.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div><p className="text-xs text-slate-500">رقم الطلب</p><p className="mt-1 font-black">{escrow.order.orderNo}</p></div>
                  <span className="rounded-full bg-orange-50 px-3 py-2 text-sm font-bold text-orange-800">{escrowLabels[escrow.status]}</span>
                </div>
                <div className="grid gap-4 py-5 sm:grid-cols-2">
                  <div><p className="font-bold">العميل</p><p className="mt-1 text-sm text-slate-600">{escrow.order.customer.displayName} — {escrow.order.customer.email}</p></div>
                  <div><p className="font-bold">مقدم الخدمة</p><p className="mt-1 text-sm text-slate-600">{escrow.order.provider.displayName} — {escrow.order.provider.email}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
                  <div><p className="text-xs text-slate-500">إجمالي المحجوز</p><p className="mt-1 font-black">{money(escrow.amount)}</p></div>
                  <div><p className="text-xs text-slate-500">مستحق مقدم الخدمة</p><p className="mt-1 font-bold">{money(escrow.providerAmount)}</p></div>
                  <div><p className="text-xs text-slate-500">عمولة المنصة</p><p className="mt-1 font-bold">{money(escrow.platformFee)}</p></div>
                </div>

                {escrow.order.dispute && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex flex-wrap justify-between gap-2"><strong>النزاع</strong><span className="text-sm font-bold">{disputeLabels[escrow.order.dispute.status]}</span></div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{escrow.order.dispute.reason}</p>
                    {escrow.order.dispute.resolutionNote && <p className="mt-3 text-sm">قرار الإدارة: {escrow.order.dispute.resolutionNote}</p>}
                  </div>
                )}

                {escrow.resolutionNote && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm">ملاحظة القرار: {escrow.resolutionNote}</p>}
                {escrow.externalReference && <p className="mt-2 text-xs text-slate-500">مرجع التحويل الخارجي: <span dir="auto" className="font-bold">{escrow.externalReference}</span></p>}

                <div className="mt-5 border-t border-slate-100 pt-4">
                  <h2 className="font-black">السجل المحاسبي</h2>
                  <ul className="mt-3 space-y-2">
                    {escrow.ledgerEntries.map((entry) => (
                      <li key={entry.id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-slate-50 p-3 text-sm"><span>{ledgerLabels[entry.type] || entry.type}</span><strong>{money(entry.amount)}</strong></li>
                    ))}
                  </ul>
                </div>

                <AdminEscrowActions
                  orderId={escrow.orderId}
                  escrowStatus={escrow.status}
                  orderStatus={escrow.order.status}
                  disputeId={escrow.order.dispute?.id ?? null}
                  disputeStatus={escrow.order.dispute?.status ?? null}
                />
                <p className="mt-4 text-xs text-slate-400">تاريخ إنشاء السجل: {escrow.createdAt.toLocaleString("en-GB")}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
