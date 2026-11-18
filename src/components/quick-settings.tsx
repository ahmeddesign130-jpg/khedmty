"use client";

import { useState } from "react";
import Link from "next/link";
import { UiIcon } from "@/components/ui-icon";

export function QuickSettings() {
  const [open, setOpen] = useState(false);

  return (
    <div dir="rtl" className="fixed bottom-5 left-5 z-[60]">
      {open && (
        <div className="mb-3 w-64 overflow-hidden rounded-2xl border border-slate-100 bg-white p-2 shadow-2xl">
          <div className="rounded-xl bg-[#14213d] px-4 py-3 text-white">
            <p className="text-xs text-orange-300">خِدمتي</p>
            <p className="mt-1 font-black">الإعدادات السريعة</p>
          </div>
          <Link onClick={() => setOpen(false)} href="/settings" className="mt-2 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-[#14213d] hover:bg-orange-50">
            <UiIcon name="user-cog" size={20} /> إعدادات الحساب
          </Link>
          <div className="flex items-center justify-between rounded-xl px-3 py-3 text-sm text-[#14213d]">
            <span className="flex items-center gap-3 font-bold"><UiIcon name="languages" size={20} /> اللغة</span>
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-700">العربية</span>
          </div>
          <Link onClick={() => setOpen(false)} href="/orders" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-[#14213d] hover:bg-orange-50">
            <UiIcon name="clipboard-list" size={20} /> الطلبات
          </Link>
          <Link onClick={() => setOpen(false)} href="/settings" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-[#14213d] hover:bg-orange-50">
            <UiIcon name="shield" size={20} /> الخصوصية والأمان
          </Link>
          <form action="/api/auth/logout" method="POST">
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-red-600 hover:bg-red-50">
              <UiIcon name="log-out" size={20} /> تسجيل الخروج
            </button>
          </form>
        </div>
      )}
      <button
        type="button"
        aria-label="فتح الإعدادات السريعة"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#14213d] text-white shadow-xl ring-4 ring-white transition hover:-translate-y-1 hover:bg-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-200"
      >
        <UiIcon name={open ? "plus-circle" : "settings"} size={25} />
      </button>
    </div>
  );
}
