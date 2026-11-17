import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminProvidersPage() {
  const admin = await getCurrentUser();

  if (!admin) redirect("/login");
  if (admin.role !== "SUPER_ADMIN") redirect("/account");

  async function reviewProvider(formData: FormData) {
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

    const provider = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, status: true },
    });

    if (!provider || provider.role !== "PROVIDER" || provider.status !== "PENDING") {
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          status: action === "APPROVE" ? "ACTIVE" : "SUSPENDED",
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: currentAdmin.id,
          action: action === "APPROVE" ? "PROVIDER_APPROVED" : "PROVIDER_REJECTED",
          targetId: id,
          details: action === "APPROVE"
            ? "تم اعتماد حساب مقدم الخدمة."
            : `سبب رفض الحساب: ${reason}`,
        },
      });
    });

    revalidatePath("/admin/providers");
    revalidatePath("/admin");
  }

  const providers = await prisma.user.findMany({
    where: {
      role: "PROVIDER",
      status: "PENDING",
    },
    select: {
      id: true,
      displayName: true,
      email: true,
      createdAt: true,
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
          مراجعة مقدمي الخدمات
        </h1>
        <p className="mt-3 text-gray-500">
          راجع الحسابات الجديدة واتخذ قرار الموافقة أو الرفض.
        </p>

        <div className="mt-8 rounded-2xl bg-white p-5 shadow-sm">
          <p className="font-bold">
            الحسابات المنتظرة:
            <span className="mr-2 text-orange-500">{providers.length}</span>
          </p>
        </div>

        {providers.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-bold">لا توجد حسابات معلقة حاليًا</h2>
            <p className="mt-3 text-gray-500">
              ستظهر هنا طلبات مقدمي الخدمات الجديدة.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5">
            {providers.map((provider) => (
              <article key={provider.id} className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="text-xl font-black text-[#14213d]">
                  {provider.displayName}
                </h2>
                <p className="mt-2 text-gray-600">{provider.email}</p>
                <p className="mt-2 text-sm text-gray-400">
                  تاريخ التسجيل: {provider.createdAt.toLocaleDateString("en-GB")}
                </p>

                <form action={reviewProvider} className="mt-6 space-y-4">
                  <input type="hidden" name="id" value={provider.id} />

                  <div>
                    <label className="mb-2 block font-bold">
                      سبب الرفض (مطلوب عند الرفض)
                    </label>
                    <textarea
                      name="reason"
                      rows={3}
                      maxLength={1000}
                      placeholder="اكتب سبب الرفض إذا قررت رفض الحساب..."
                      className="w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      name="action"
                      value="APPROVE"
                      className="rounded-xl bg-green-600 px-6 py-3 font-bold text-white"
                    >
                      الموافقة على الحساب
                    </button>

                    <button
                      name="action"
                      value="REJECT"
                      className="rounded-xl bg-red-600 px-6 py-3 font-bold text-white"
                      formNoValidate
                    >
                      رفض الحساب
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
