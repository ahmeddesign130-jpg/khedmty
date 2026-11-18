import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminServicesPage() {
  const admin = await getCurrentUser();

  if (!admin) redirect("/login");
  if (admin.role !== "SUPER_ADMIN") redirect("/account");

  async function reviewService(formData: FormData) {
    "use server";

    const currentAdmin = await getCurrentUser();

    if (!currentAdmin || currentAdmin.role !== "SUPER_ADMIN") {
      redirect("/login");
    }

    const id = String(formData.get("id") || "");
    const action = String(formData.get("action") || "");
    const reason = String(formData.get("reason") || "").trim();

    if (!id || !["APPROVE", "REJECT"].includes(action)) return;
    if (action === "REJECT" && !reason) return;

    const service = await prisma.service.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!service || service.status !== "PENDING_REVIEW") return;

    await prisma.$transaction(async (tx) => {
      await tx.service.update({
        where: { id },
        data: {
          status: action === "APPROVE" ? "APPROVED" : "REJECTED",
          reviewNote: action === "REJECT" ? reason : null,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: currentAdmin.id,
          action: action === "APPROVE" ? "SERVICE_APPROVED" : "SERVICE_REJECTED",
          targetId: id,
          details: action === "REJECT"
            ? `سبب رفض الخدمة: ${reason}`
            : "تمت الموافقة على الخدمة.",
        },
      });
    });

    revalidatePath("/admin/services");
    revalidatePath("/admin");
    revalidatePath("/services");
  }

  const services = await prisma.service.findMany({
    where: { status: "PENDING_REVIEW" },
    select: {
      id: true,
      serviceNo: true,
      title: true,
      description: true,
      price: true,
      mediaUrls: true,
      createdAt: true,
      provider: {
        select: {
          displayName: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main dir="rtl" className="min-h-screen bg-[#f5f6f8]">
      <header className="bg-[#14213d] px-5 py-6 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/admin" className="text-2xl font-black text-orange-400">
            خِدمتي
          </Link>
          <Link href="/admin" className="font-bold">لوحة الإدارة</Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-10">
        <h1 className="text-3xl font-black text-[#14213d]">
          مراجعة الخدمات
        </h1>
        <p className="mt-3 text-gray-500">
          راجع تفاصيل كل خدمة قبل نشرها للعملاء.
        </p>

        <div className="mt-8 rounded-2xl bg-white p-5 shadow-sm">
          <p className="font-bold">
            الخدمات المنتظرة:
            <span className="mr-2 text-orange-500">{services.length}</span>
          </p>
        </div>

        {services.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-bold">لا توجد خدمات قيد المراجعة</h2>
            <p className="mt-3 text-gray-500">
              ستظهر هنا الخدمات الجديدة التي يقدمها أصحاب الحسابات.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5">
            {services.map((service) => (
              <article key={service.id} className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-black text-[#14213d]">
                    {service.title}
                  </h2>
                  <span className="rounded-lg bg-orange-50 px-3 py-2 text-sm font-bold text-orange-700">
                    رقم الخدمة: {service.serviceNo}
                  </span>
                </div>

                <p className="mt-4 leading-8 text-gray-600">
                  {service.description}
                </p>
                {service.mediaUrls.length>0&&<div className="mt-4 grid gap-3 sm:grid-cols-2">{service.mediaUrls.map((url,index)=> /\.(mp4|webm|mov)(\?|$)/i.test(url)?<video key={url} src={url} controls className="max-h-72 w-full rounded-xl bg-black object-contain"/>:<img key={url} src={url} alt={`${service.title} - ${index+1}`} className="max-h-72 w-full rounded-xl object-contain"/>)}</div>}

                <div className="mt-4 grid gap-2 rounded-xl bg-gray-50 p-4 text-sm">
                  <p>مقدم الخدمة: {service.provider.displayName}</p>
                  <p>البريد: {service.provider.email}</p>
                  <p>السعر: {service.price} EG</p>
                  <p>
                    تاريخ الإضافة: {service.createdAt.toLocaleDateString("en-GB")}
                  </p>
                </div>

                <form action={reviewService} className="mt-6 space-y-4">
                  <input type="hidden" name="id" value={service.id} />

                  <div>
                    <label className="mb-2 block font-bold">
                      سبب الرفض (مطلوب عند الرفض)
                    </label>
                    <textarea
                      name="reason"
                      rows={3}
                      maxLength={1000}
                      placeholder="اكتب سبب الرفض إذا كانت الخدمة غير مناسبة..."
                      className="w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      name="action"
                      value="APPROVE"
                      className="rounded-xl bg-green-600 px-6 py-3 font-bold text-white"
                    >
                      الموافقة على الخدمة
                    </button>

                    <button
                      name="action"
                      value="REJECT"
                      formNoValidate
                      className="rounded-xl bg-red-600 px-6 py-3 font-bold text-white"
                    >
                      رفض الخدمة
                    </button>
                  </div>
                </form>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
