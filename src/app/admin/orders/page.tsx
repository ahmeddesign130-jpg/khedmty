import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  DELIVERY_REVIEW: "مراجعة تسليم العمل",
  PENDING_PAYMENT: "في انتظار الدفع",
  PAYMENT_REVIEW: "مراجعة الدفع",
  PAID: "تم الدفع",
  IN_PROGRESS: "قيد التنفيذ",
  DELIVERED: "تم التسليم",
  REVISION_REQUESTED: "مطلوب تعديل",
  COMPLETED: "مكتمل",
  CANCELLED: "ملغي",
  REJECTED: "مرفوض",
};


async function reviewDelivery(formData: FormData) {
  "use server";
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "SUPER_ADMIN") redirect("/login");
  const id = String(formData.get("id") || "");
  const decision = String(formData.get("decision") || "");
  const note = String(formData.get("reviewNote") || "").trim();
  if (!id || !["APPROVED", "REJECTED"].includes(decision) || note.length > 1000 || (decision === "REJECTED" && !note)) return;
  const order = await prisma.order.findFirst({ where: { id, status: "DELIVERY_REVIEW" }, include: { deliveryFiles: { select: { id: true } } } });
  if (!order || order.deliveryFiles.length === 0) return;
  await prisma.$transaction(async (tx) => {
    const changed = await tx.order.updateMany({
      where: { id, status: "DELIVERY_REVIEW" },
      data: { status: decision === "APPROVED" ? "DELIVERED" : "IN_PROGRESS" },
    });
    if (changed.count !== 1) throw new Error("DELIVERY_REVIEW_CONFLICT");
    if (decision === "REJECTED") {
      // Remove rejected file records so they can never be exposed to the customer after a later approval.
      await tx.orderDeliveryFile.deleteMany({ where: { orderId: id } });
    }
    await tx.notification.create({
      data: {
        userId: decision === "APPROVED" ? order.customerId : order.providerId,
        title: decision === "APPROVED" ? "تم اعتماد وتسليم العمل" : "مطلوب تعديل ملفات التسليم",
        body: decision === "APPROVED"
          ? `اعتمدت الإدارة ملفات الطلب ${order.orderNo}. يمكنك الآن مراجعة الملفات من تفاصيل الطلب.`
          : `راجعت الإدارة ملفات الطلب ${order.orderNo} وطلبت تعديلها. السبب: ${note}`,
        href: `/orders/${order.id}`,
      },
    });
    await tx.auditLog.create({
      data: { actorId: admin.id, action: decision === "APPROVED" ? "DELIVERY_APPROVED" : "DELIVERY_REJECTED", targetId: order.id, details: note || `اعتماد تسليم الطلب ${order.orderNo}` },
    });
  });
  revalidatePath("/admin/orders");
  revalidatePath("/provider/orders");
  revalidatePath("/orders");
  revalidatePath(`/orders/${id}`);
}

export default async function AdminOrdersPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== "SUPER_ADMIN") {
    redirect("/login");
  }

  const orders = await prisma.order.findMany({
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
      payments: true,
      deliveryFiles: { orderBy: { createdAt: "asc" } },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const serviceRecords = await prisma.service.findMany({
    where: { id: { in: [...new Set(orders.map((order) => order.serviceId))] } },
    select: { id: true, title: true, serviceNo: true },
  });
  const serviceById = new Map(serviceRecords.map((service) => [service.id, service]));

  const money = (amount: number) =>
    `${amount.toLocaleString("en-US")} EG`;

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <a
          href="/admin"
          className="mb-6 inline-block text-sm font-bold text-orange-600"
        >
          ← العودة للوحة الإدارة
        </a>

        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900">
            إدارة الطلبات
          </h1>
          <p className="mt-2 text-slate-500">
            متابعة جميع طلبات العملاء ومقدمي الخدمات
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">إجمالي الطلبات</p>
            <p className="mt-2 text-2xl font-black text-slate-900">
              {orders.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">في انتظار الدفع</p>
            <p className="mt-2 text-2xl font-black text-orange-600">
              {orders.filter((o) => o.status === "PENDING_PAYMENT").length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">قيد التنفيذ</p>
            <p className="mt-2 text-2xl font-black text-blue-600">
              {orders.filter((o) => o.status === "IN_PROGRESS").length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">مكتملة</p>
            <p className="mt-2 text-2xl font-black text-green-600">
              {orders.filter((o) => o.status === "COMPLETED").length}
            </p>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="text-lg font-bold text-slate-700">
              لا توجد طلبات حتى الآن
            </p>
            <p className="mt-2 text-sm text-slate-500">
              ستظهر الطلبات هنا بمجرد قيام العملاء بإنشائها.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <section
                key={order.id}
                className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <p className="text-xs text-slate-400">رقم الطلب</p>
                    <p className="mt-1 font-black text-slate-900">
                      {order.orderNo}
                    </p>
                  </div>

                  <span className="rounded-full bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700">
                    {statusLabels[order.status] ?? order.status}
                  </span>
                </div>

                <div className="grid gap-5 py-5 md:grid-cols-2">
                  <div>
                    <p className="mb-2 text-sm font-bold text-slate-800">الخدمة</p>
                    <p className="text-sm text-slate-600">{serviceById.get(order.serviceId)?.title || "الخدمة"}</p>
                    <p className="mt-1 text-xs text-slate-400">رقم الخدمة للإدارة: {serviceById.get(order.serviceId)?.serviceNo || "غير متاح"}</p>
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-bold text-slate-800">
                      بيانات العميل
                    </p>
                    <p className="text-sm text-slate-600">
                      {order.customer.displayName}
                    </p>
                    <p className="text-xs text-slate-400">
                      {order.customer.email}
                    </p>
                    <p className="mt-2 text-sm text-slate-600" dir="auto">وسيلة التواصل: {order.customerContact || "غير محددة"}</p>
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-bold text-slate-800">
                      مقدم الخدمة
                    </p>
                    <p className="text-sm text-slate-600">
                      {order.provider.displayName}
                    </p>
                    <p className="text-xs text-slate-400">
                      {order.provider.email}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-5">
                  <div>
                    <p className="text-xs text-slate-500">سعر الخدمة</p>
                    <p className="mt-1 font-bold text-slate-800">
                      {money(order.servicePrice)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      العمولة ({order.commissionRate}%)
                    </p>
                    <p className="mt-1 font-bold text-slate-800">
                      {money(order.commission)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">صافي مقدم الخدمة</p>
                    <p className="mt-1 font-bold text-slate-800">{money(order.providerNet)}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">السعر النهائي للعميل</p>
                    <p className="mt-1 font-black text-orange-600">
                      {money(order.total)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">عدد عمليات الدفع</p>
                    <p className="mt-1 font-bold text-slate-800">
                      {order.payments.length}
                    </p>
                  </div>
                </div>

                {order.deliveryFiles.length > 0 && (
                  <section className="mt-5 rounded-xl border border-slate-200 p-4">
                    <h2 className="font-black text-slate-800">ملفات العمل المرفوعة</h2>
                    <div className="mt-3 space-y-2">{order.deliveryFiles.map((file) => (
                      <a key={file.id} href={`/api/orders/${order.id}/delivery/${file.id}`} className="block rounded-lg bg-slate-50 p-3 text-sm font-bold text-orange-700">{file.fileName} — تحميل ومراجعة</a>
                    ))}</div>
                    {order.status === "DELIVERY_REVIEW" && (
                      <form action={reviewDelivery} className="mt-4 space-y-3">
                        <input type="hidden" name="id" value={order.id} />
                        <label className="block text-sm font-bold">سبب طلب التعديل (مطلوب عند الرفض)
                          <textarea name="reviewNote" rows={2} maxLength={1000} className="mt-2 w-full rounded-xl border p-3" />
                        </label>
                        <div className="flex flex-wrap gap-2">
                          <button name="decision" value="APPROVED" className="rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white">اعتماد التسليم وإرساله للعميل</button>
                          <button name="decision" value="REJECTED" formNoValidate className="rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white">طلب تعديل من مقدم الخدمة</button>
                        </div>
                      </form>
                    )}
                  </section>
                )}

                <div className="mt-4 text-xs text-slate-400">
                  تاريخ الطلب:{" "}
                  {new Date(order.createdAt).toLocaleString("en-GB")}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
            }
