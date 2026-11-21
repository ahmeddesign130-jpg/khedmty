import Link from "next/link";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UiIcon } from "@/components/ui-icon";
import { AppearanceLanguageControls } from "@/components/appearance-language-controls";

async function changePassword(formData: FormData) {
  "use server";
  const session = await getCurrentUser();
  if (!session || session.status !== "ACTIVE") redirect("/login");
  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");
  if (newPassword.length < 10 || newPassword.length > 72 || newPassword !== confirmPassword) redirect("/settings?error=password_invalid");
  const account = await prisma.user.findUnique({ where: { id: session.id }, select: { passwordHash: true } });
  if (!account || !(await bcrypt.compare(currentPassword, account.passwordHash))) redirect("/settings?error=password_current");
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: session.id }, data: { passwordHash } });
  redirect("/settings?success=password");
}

async function updateProfile(formData: FormData) {
  "use server";
  const session = await getCurrentUser();
  if (!session || session.status !== "ACTIVE") redirect("/login");
  const displayName = String(formData.get("displayName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const bio = String(formData.get("bio") || "").trim();
  const skills = String(formData.get("skills") || "").split(",").map((item) => item.trim()).filter(Boolean).slice(0, 10);
  if (displayName.length < 2 || displayName.length > 70 || phone.length > 30 || bio.length > 600 || skills.some((item) => item.length > 40)) redirect("/settings?error=invalid_profile");
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: session.id }, data: { displayName } });
    await tx.profile.upsert({
      where: { userId: session.id },
      update: { displayName, phone: phone || null, bio: bio || null, skills },
      create: { userId: session.id, displayName, phone: phone || null, bio: bio || null, skills },
    });
  });
  revalidatePath("/settings");
  revalidatePath("/account");
  revalidatePath("/provider");
  redirect("/settings?success=profile");
}


async function requestAccountDeletion(formData: FormData) {
  "use server";
  const session = await getCurrentUser();
  if (!session || session.status !== "ACTIVE" || session.role !== "CUSTOMER") redirect("/login");
  const confirmation = String(formData.get("confirmation") || "").trim();
  if (confirmation !== "حذف حسابي") redirect("/settings?error=delete_confirmation");
  const activeOrders = await prisma.order.count({
    where: { customerId: session.id, status: { notIn: ["COMPLETED", "CANCELLED", "REJECTED"] } },
  });
  if (activeOrders > 0) redirect("/settings?error=delete_active_orders");
  const previous = await prisma.auditLog.findFirst({
    where: { targetId: session.id, action: "ACCOUNT_DELETION_REQUESTED" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (previous) redirect("/settings?success=delete_pending");
  await prisma.auditLog.create({
    data: { actorId: session.id, targetId: session.id, action: "ACCOUNT_DELETION_REQUESTED", details: "طلب العميل حذف الحساب؛ يحتاج مراجعة الإدارة والتأكد من عدم وجود التزامات مالية أو نزاعات." },
  });
  revalidatePath("/settings");
  redirect("/settings?success=delete_pending");
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const params = await searchParams;
  const session = await getCurrentUser();
  if (!session) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { email: true, displayName: true, role: true, profile: { select: { phone: true, bio: true, skills: true } } },
  });
  if (!user) redirect("/login");

  const roleLabel = user.role === "SUPER_ADMIN" ? "مدير المنصة" : user.role === "PROVIDER" ? "مقدم خدمة" : "عميل";

  return <main dir="rtl" className="khedmty-settings-page min-h-screen bg-[#f7f8fa]">
    <header className="bg-white shadow-sm">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-5">
        <Link href="/" className="text-2xl font-black text-orange-500">خِدمتي</Link>
        <Link href={user.role === "SUPER_ADMIN" ? "/admin" : user.role === "PROVIDER" ? "/provider" : "/account"} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 font-bold text-[#14213d]"><UiIcon name="arrow-left" size={18}/> العودة للوحة التحكم</Link>
      </div>
    </header>
    <section className="mx-auto max-w-4xl px-5 py-10">
      {params.success === "profile" && <p role="status" className="mb-5 rounded-xl bg-green-50 p-4 font-bold text-green-700">تم حفظ بيانات الحساب بنجاح.</p>}
      {params.success === "password" && <p role="status" className="mb-5 rounded-xl bg-green-50 p-4 font-bold text-green-700">تم تغيير كلمة المرور بنجاح.</p>}
      {params.error === "password_invalid" && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 font-bold text-red-700">تأكد من تطابق كلمتي المرور وأن الجديدة 10 أحرف على الأقل.</p>}
      {params.error === "password_current" && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 font-bold text-red-700">كلمة المرور الحالية غير صحيحة.</p>}
      {params.error === "invalid_profile" && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 font-bold text-red-700">راجع البيانات المدخلة وحاول مرة أخرى.</p>}
      {params.error === "delete_confirmation" && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 font-bold text-red-700">اكتب «حذف حسابي» كما هي لتأكيد طلب الحذف.</p>}
      {params.error === "delete_active_orders" && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 font-bold text-red-700">لا يمكن طلب حذف الحساب قبل انتهاء الطلبات النشطة وتسوية أي التزامات.</p>}
      {params.success === "delete_pending" && <p role="status" className="mb-5 rounded-xl bg-amber-50 p-4 font-bold text-amber-900">تم تسجيل طلب حذف حسابك للمراجعة الإدارية. سيظل الحساب موجودًا حتى تراجع الإدارة الطلب وتتأكد من تسوية الالتزامات.</p>}
      <div className="rounded-3xl bg-[#14213d] p-7 text-white shadow-lg">
        <span className="ui-icon-tile ui-icon-tile-dark"><UiIcon name="settings" size={28}/></span>
        <p className="mt-4 text-orange-300">تحكم في تفضيلاتك</p>
        <h1 className="mt-2 text-3xl font-black">الإعدادات</h1>
        <p className="mt-3 leading-8 text-slate-300">إعدادات الحساب ولغة الموقع في مكان واحد.</p>
      </div>
      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <span className="ui-icon-tile"><UiIcon name="user-cog" size={26}/></span>
          <h2 className="mt-4 text-xl font-black text-[#14213d]">إعدادات الحساب</h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">بيانات الحساب المسجل حاليًا.</p>
          <div className="mt-5 space-y-3 text-sm">
            <div className="rounded-xl bg-slate-50 p-3"><span className="block text-xs text-slate-500">الاسم</span><strong className="mt-1 block">{user.displayName}</strong></div>
            <div className="rounded-xl bg-slate-50 p-3"><span className="block text-xs text-slate-500">البريد الإلكتروني</span><strong dir="ltr" className="mt-1 block text-left">{user.email}</strong></div>
            <div className="rounded-xl bg-slate-50 p-3"><span className="block text-xs text-slate-500">نوع الحساب</span><strong className="mt-1 block">{roleLabel}</strong></div>
          </div>
        </section>
      </div>
      <section className="mt-7 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <span className="ui-icon-tile"><UiIcon name="user-cog" size={26}/></span>
        <h2 className="mt-4 text-xl font-black text-[#14213d]">تعديل بيانات الحساب</h2>
        <p className="mt-2 text-sm leading-7 text-slate-500">حدّث اسم العرض ووسيلة التواصل والنبذة والمهارات.</p>
        <form action={updateProfile} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-bold text-slate-700">الاسم الظاهر
            <input name="displayName" required minLength={2} maxLength={70} defaultValue={user.displayName} className="mt-2 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-orange-500"/>
          </label>
          <label className="block text-sm font-bold text-slate-700">رقم الهاتف أو وسيلة التواصل
            <input name="phone" maxLength={30} defaultValue={user.profile?.phone || ""} dir="ltr" className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-left outline-none focus:border-orange-500"/>
          </label>
          <label className="block text-sm font-bold text-slate-700 sm:col-span-2">نبذة عنك
            <textarea name="bio" maxLength={600} rows={3} defaultValue={user.profile?.bio || ""} className="mt-2 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-orange-500"/>
          </label>
          <label className="block text-sm font-bold text-slate-700 sm:col-span-2">المهارات (افصل بينها بفاصلة)
            <input name="skills" maxLength={400} defaultValue={user.profile?.skills.join(", ") || ""} className="mt-2 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-orange-500"/>
          </label>
          <button type="submit" className="rounded-xl bg-orange-500 px-5 py-3.5 font-black text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 sm:col-span-2">حفظ بيانات الحساب</button>
        </form>
      </section>
      <section className="mt-7 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <span className="ui-icon-tile"><UiIcon name="shield" size={26}/></span>
        <h2 className="settings-password-title mt-4 inline-flex rounded-xl bg-[#14213d] px-4 py-2 text-xl font-black text-white">تغيير كلمة المرور</h2>
        <p className="mt-2 text-base font-semibold leading-8 text-slate-700">استخدم كلمة مرور قوية لا تقل عن 10 أحرف.</p>
        <form action={changePassword} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-bold text-slate-700 sm:col-span-2">كلمة المرور الحالية
            <input name="currentPassword" type="password" autoComplete="current-password" required maxLength={72} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-left outline-none focus:border-orange-500" dir="ltr"/>
          </label>
          <label className="block text-sm font-bold text-slate-700">كلمة المرور الجديدة
            <input name="newPassword" type="password" autoComplete="new-password" required minLength={10} maxLength={72} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-left outline-none focus:border-orange-500" dir="ltr"/>
          </label>
          <label className="block text-sm font-bold text-slate-700">تأكيد كلمة المرور
            <input name="confirmPassword" type="password" autoComplete="new-password" required minLength={10} maxLength={72} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-left outline-none focus:border-orange-500" dir="ltr"/>
          </label>
          <button type="submit" className="rounded-xl bg-[#14213d] px-5 py-3.5 font-black text-white transition hover:bg-orange-600 sm:col-span-2">تحديث كلمة المرور</button>
        </form>
      </section>

      {user.role === "CUSTOMER" && <section className="mt-7 rounded-2xl border border-orange-200 bg-white p-6 shadow-sm">
        <span className="ui-icon-tile"><UiIcon name="briefcase" size={26}/></span>
        <h2 className="mt-4 text-xl font-black text-[#14213d]">تغيير نوع الحساب</h2>
        <p className="mt-2 text-base font-semibold leading-8 text-slate-700">تقدر تقدم طلب للانضمام كمقدم خدمة وعرض خدماتك على المنصة. حسابك هيفضل حساب عميل لحد ما الإدارة تراجع طلبك وتوافق عليه.</p>
        <Link href="/account#provider-application" className="settings-provider-cta mt-5 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-orange-500 px-6 py-4 text-lg font-black text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 sm:w-auto"><UiIcon name="briefcase" size={22}/> أريد أن أصبح مقدم خدمة <UiIcon name="arrow-left" size={20}/></Link>
      </section>}
      {user.role === "CUSTOMER" && <section className="mt-7 rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
        <span className="ui-icon-tile"><UiIcon name="user" size={26}/></span>
        <h2 className="mt-4 text-xl font-black text-red-700">حذف الحساب</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">يرسل هذا الإجراء طلب حذف إلى الإدارة. لا يتم حذف سجلات الطلبات والمدفوعات تلقائيًا، ويجب تسوية الطلبات النشطة والنزاعات أولًا.</p>
        <form action={requestAccountDeletion} className="mt-4 space-y-3">
          <label className="block text-sm font-bold text-slate-700">اكتب «حذف حسابي» لتأكيد الطلب
            <input name="confirmation" required autoComplete="off" placeholder="حذف حسابي" className="mt-2 w-full rounded-xl border border-slate-200 p-3"/>
          </label>
          <button type="submit" className="min-h-12 rounded-xl bg-red-600 px-5 py-3 font-black text-white">إرسال طلب حذف الحساب</button>
        </form>
      </section>}
      <div className="mt-5"><AppearanceLanguageControls userId={session.id} /></div>
    </section>
  </main>;
}
