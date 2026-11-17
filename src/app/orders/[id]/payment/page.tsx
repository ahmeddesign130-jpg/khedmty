import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  if (user.role !== "CUSTOMER" || user.status !== "ACTIVE") {
    redirect("/account");
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      payments: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!order || order.customerId !== user.id) notFound();

  if (order.status !== "PENDING_PAYMENT") {
    redirect(`/orders/${order.id}`);
  }

  const latestPayment = order.payments[0];

  return (
    <main dir="rtl" className="min-h-screen bg-[#f5f6f8]">
      <header className="bg-[#14213d] px-5 py-5 text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="text-2xl font-black text-orange-400">
            خِدمتي
          </Link>
          <Link href={`/orders/${order.id}`} className="font-bold">
            تفاصيل الطلب
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-5 py-10">
        <div className="rounded-3xl bg-white p-6 shadow-sm md:p-9">
          <h1 className="text-2xl font-black text-[#14213d]">
            إتمام الدفع
          </h1>

          <p className="mt-3 leading-7 text-slate-600">
            استخدم إحدى وسائل الدفع المتاحة، واحتفظ بإثبات التحويل.
            لن يتم اعتماد طلبك إلا بعد مراجعة الإدارة والتحقق من وصول المبلغ.
          </p>

          <div className="mt-7 rounded-2xl bg-[#14213d] p-6 text-white">
            <p className="text-sm text-slate-300">رقم الطلب</p>
            <p className="mt-2 text-xl font-black">{order.orderNo}</p>

            <div className="mt-6 border-t border-white/20 pt-5">
              <p className="text-sm text-slate-300">
                المبلغ المطلوب تحويله
              </p>
              <p className="mt-2 text-3xl font-black text-orange-400">
                {order.total.toLocaleString("en-US")} EG
              </p>
            </div>
          </div>

          <div className="mt-7">
            <h2 className="text-lg font-black text-[#14213d]">
              وسائل الدفع المتاحة
            </h2>

            <div className="mt-4 grid gap-3">
              {["InstaPay", "e& money", "Etisalat Cash"].map((method) => (
                <div
                  key={method}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <p className="font-black text-[#14213d]">{method}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    استخدم بيانات التحويل الرسمية التي توفرها إدارة خِدمتي.
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-7 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm leading-7 text-orange-900">
            <strong>تنبيه مهم:</strong>
            لا تحوّل أي مبلغ قبل الحصول على بيانات الدفع الرسمية من الإدارة.
            بيانات التحويل لم تتم إضافتها إلى الموقع بعد.
          </div>

          <div className="mt-7">
            <h2 className="text-lg font-black text-[#14213d]">
              حالة الدفع
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {latestPayment
                ? "يوجد سجل دفع لهذا الطلب. يمكنك متابعة حالته من تفاصيل الطلب."
                : "لم يتم تسجيل عملية دفع لهذا الطلب حتى الآن."}
            </p>
          </div>

          <Link
            href={`/orders/${order.id}`}
            className="mt-7 block rounded-xl bg-orange-500 px-6 py-4 text-center font-black text-white"
          >
            العودة إلى تفاصيل الطلب
          </Link>
        </div>
      </section>
    </main>
  );
}
