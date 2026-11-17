import Link from "next/link";

export default function PendingPage() {
  return (
    <main dir="rtl" className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-5">
      <div className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-lg">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-orange-100 text-4xl text-orange-500">
          !
        </div>

        <h1 className="mt-7 text-3xl font-black text-[#14213d]">
          حسابك قيد المراجعة
        </h1>

        <p className="mt-5 leading-9 text-gray-600">
          شكرًا لانضمامك إلى خِدمتي كمقدم خدمة.
          حسابك حاليًا في انتظار مراجعة وموافقة إدارة المنصة.
          سنتمكن من إتاحة لوحة مقدم الخدمة بعد الموافقة.
        </p>

        <div className="mt-7 rounded-2xl bg-orange-50 p-5 text-sm leading-7 text-orange-800">
          لا تحتاج إلى إنشاء حساب جديد. انتظر حتى تنتهي الإدارة من مراجعة حسابك.
        </div>

        <Link
          href="/"
          className="mt-8 inline-block rounded-xl bg-orange-500 px-8 py-4 font-bold text-white"
        >
          العودة إلى الرئيسية
        </Link>
      </div>
    </main>
  );
}
