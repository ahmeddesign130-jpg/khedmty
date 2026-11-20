import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transitionOrder } from "@/lib/escrow";
import type { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

async function changeStatus(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user || user.role !== "PROVIDER" || user.status !== "ACTIVE") redirect("/login");
  const id = String(formData.get("id") || "");
  const next = String(formData.get("status") || "");
  if (!id || !["IN_PROGRESS", "DELIVERED"].includes(next)) return;
  try {
    await transitionOrder(id, user.id, user.role, next as OrderStatus);
  } catch (error) {
    console.error("Provider order transition failed:", error);
    return;
  }
  revalidatePath("/provider/orders");
  revalidatePath("/orders/" + id);
  revalidatePath("/admin/orders");
  revalidatePath("/admin/escrow");
}

const labels: Record<string, string> = {
  PENDING_PAYMENT: "في انتظار دفع العميل",
  PAYMENT_REVIEW: "مراجعة الدفع",
  PAID: "تم اعتماد الدفع",
  IN_PROGRESS: "قيد التنفيذ",
  DELIVERED: "تم التسليم للعميل",
  REVISION_REQUESTED: "مطلوب تعديل",
  COMPLETED: "أكد العميل الاستلام",
  DISPUTED: "نزاع قيد مراجعة الإدارة",
  REFUNDED: "تم تسجيل الاسترداد",
  CANCELLED: "ملغي",
  REJECTED: "مرفوض",
};
const escrowLabels: Record<string, string> = {
  HELD: "المبلغ محجوز محاسبيًا",
  DISPUTED: "الصرف متوقف بسبب نزاع",
  RELEASED: "تم تسجيل الصرف اليدوي",
  REFUNDED: "تم تسجيل الاسترداد اليدوي",
};

export default async function ProviderOrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "PROVIDER") redirect("/account");
  if (user.status !== "ACTIVE") redirect("/pending");

  const orders = await prisma.order.findMany({
    where: { providerId: user.id },
    include: {
      customer: { select: { displayName: true } },
      escrow: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-5 md:p-9">
      <section aria-labelledby="provider-orders-title" className="mx-auto max-w-5xl">
        <header className="mb-5"><Link href="/provider" className="font-bold text-orange-600">← لوحة مقدم الخدمة</Link></header>
        <h1 id="provider-orders-title" className="mt-5 text-3xl font-black">طلبات العملاء</h1>
        <p className="mt-2 text-sm leading-7 text-slate-600">لا تبدأ التنفيذ قبل اعتماد التحويل. الرصيد المعروض حجز محاسبي داخلي فقط، وليس حساب ضمان منفصلًا أو رصيدًا تم تحويله لك.</p>
        {orders.length === 0 ? (
          <p className="mt-7 rounded-2xl bg-white p-8 text-center">لا توجد طلبات حتى الآن.</p>
        ) : (
          <div className="mt-7 space-y-4">
            {orders.map((order) => (
              <article key={order.id} className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex flex-wrap justify-between gap-2"><strong>{order.orderNo}</strong><span className="text-sm font-bold text-orange-600">{labels[order.status] || order.status}</span></div>
                <p className="mt-3 text-sm text-slate-600">العميل: {order.customer.displayName}</p>
                <p className="mt-2 text-xs text-slate-500">بيانات التواصل مخفية عنك حفاظًا على خصوصية العميل.</p>
                <p className="mt-2 font-black">{order.servicePrice.toLocaleString("en-US")} EG</p>
                {order.escrow && <p className="mt-3 rounded-lg bg-orange-50 p-3 text-sm font-bold text-orange-800">{escrowLabels[order.escrow.status] || order.escrow.status} — لا يتم الصرف تلقائيًا بعد التسليم أو تأكيد الاستلام.</p>}
                <Link href={"/orders/" + order.id} className="mt-4 inline-block text-sm font-bold text-orange-600">تفاصيل الطلب</Link>
                {(order.status === "PAID" || order.status === "REVISION_REQUESTED") && (
                  <form action={changeStatus} className="mt-4"><input type="hidden" name="id" value={order.id} /><button name="status" value="IN_PROGRESS" className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white">بدء التنفيذ أو استكمال التعديل</button></form>
                )}
                {order.status === "IN_PROGRESS" && (
                  <form action={changeStatus} className="mt-4"><input type="hidden" name="id" value={order.id} /><button name="status" value="DELIVERED" className="rounded-lg bg-green-600 px-4 py-3 font-bold text-white">تسليم العمل للعميل</button></form>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
