import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

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

export default async function AdminPaymentsPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== "SUPER_ADMIN") {
    redirect("/login");
  }

  const payments = await prisma.payment.findMany({
    include: {
      order: {
        include: {
          customer: {
            select: {
              displayName: true,
              email: true,
            },
          },
          provider: {
            select: {
              displayName: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const money = (amount: number) =>
    `${amount.toLocaleString("en-US")} EG`;

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <a
          href="/admin"
          className="mb-6 inline-block font-bold text-orange-600"
        >
          ← العودة للوحة الإدارة
        </a>

        <h1 className="text-3xl font-black text-slate-900">
          إدارة المدفوعات
        </h1>

        <p className="mb-8 mt-2 text-slate-500">
          مراجعة تحويلات العملاء والتحقق من إيصالات الدفع
        </p>

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">إجمالي المدفوعات</p>
            <p className="mt-2 text-2xl font-black">
              {payments.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">قيد المراجعة</p>
            <p className="mt-2 text-2xl font-black text-orange-600">
              {payments.filter((p) => p.status === "PENDING_REVIEW").length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">مقبولة</p>
            <p className="mt-2 text-2xl font-black text-green-600">
              {payments.filter((p) => p.status === "APPROVED").length}
            </p>
          </div>
        </div>

        {payments.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="font-bold text-slate-700">
              لا توجد مدفوعات حتى الآن
            </p>
            <p className="mt-2 text-sm text-slate-500">
              ستظهر هنا التحويلات التي يرسلها العملاء.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => (
              <section
                key={payment.id}
                className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <p className="text-xs text-slate-400">رقم الطلب</p>
                    <p className="mt-1 font-black text-slate-900">
                      {payment.order.orderNo}
                    </p>
                  </div>

                  <span className="rounded-full bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700">
                    {paymentStatus[payment.status] ?? payment.status}
                  </span>
                </div>

                <div className="grid gap-5 py-5 md:grid-cols-2">
                  <div>
                    <p className="mb-2 font-bold text-slate-800">
                      العميل
                    </p>
                    <p className="text-sm text-slate-600">
                      {payment.order.customer.displayName}
                    </p>
                    <p className="text-xs text-slate-400">
                      {payment.order.customer.email}
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 font-bold text-slate-800">
                      مقدم الخدمة
                    </p>
                    <p className="text-sm text-slate-600">
                      {payment.order.provider.displayName}
                    </p>
                    <p className="text-xs text-slate-400">
                      {payment.order.provider.email}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-3">
                  <div>
                    <p className="text-xs text-slate-500">طريقة الدفع</p>
                    <p className="mt-1 font-bold text-slate-800">
                      {paymentMethods[payment.method] ?? payment.method}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">المبلغ</p>
                    <p className="mt-1 font-black text-orange-600">
                      {money(payment.amount)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">إجمالي الطلب</p>
                    <p className="mt-1 font-bold text-slate-800">
                      {money(payment.order.total)}
                    </p>
                  </div>
                </div>

                {payment.receiptUrl && (
                  <div className="mt-5">
                    <p className="mb-2 font-bold text-slate-800">
                      إيصال التحويل
                    </p>
                    <a
                      href={payment.receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block rounded-xl bg-orange-50 px-4 py-3 text-sm font-bold text-orange-700"
                    >
                      فتح صورة الإيصال
                    </a>
                  </div>
                )}

                {payment.reviewNote && (
                  <div className="mt-4 rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-bold text-slate-500">
                      ملاحظة الإدارة
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {payment.reviewNote}
                    </p>
                  </div>
                )}

                <p className="mt-4 text-xs text-slate-400">
                  تاريخ الإرسال:{" "}
                  {new Date(payment.createdAt).toLocaleString("en-GB")}
                </p>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
                      }
