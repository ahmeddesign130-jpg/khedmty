"use client";

import { useState } from "react";
import Link from "next/link";
import { UiIcon } from "@/components/ui-icon";

type Role = "CUSTOMER" | "PROVIDER" | "SUPER_ADMIN";

const items: Record<Role, { href: string; label: string; icon: "search" | "clipboard-list" | "settings" | "grid" | "briefcase" | "users" | "badge-check" | "wallet" }[]> = {
  CUSTOMER: [
    { href: "/services", label: "السوق", icon: "search" },
    { href: "/orders", label: "طلباتي", icon: "clipboard-list" },
    { href: "/settings", label: "الإعدادات واللغة", icon: "settings" },
  ],
  PROVIDER: [
    { href: "/provider", label: "الرئيسية", icon: "grid" },
    { href: "/provider/services", label: "خدماتي", icon: "briefcase" },
    { href: "/provider/orders", label: "الطلبات", icon: "clipboard-list" },
    { href: "/settings", label: "الإعدادات واللغة", icon: "settings" },
  ],
  SUPER_ADMIN: [
    { href: "/admin", label: "لوحة الإدارة", icon: "grid" },
    { href: "/admin/providers", label: "مقدمو الخدمات", icon: "users" },
    { href: "/admin/services", label: "مراجعة الخدمات", icon: "badge-check" },
    { href: "/admin/orders", label: "الطلبات", icon: "clipboard-list" },
    { href: "/admin/payments", label: "المدفوعات", icon: "wallet" },
    { href: "/settings", label: "الإعدادات", icon: "settings" },
  ],
};

export function SideNavigation({ role }: { role: Role | null }) {
  const [open, setOpen] = useState(false);
  if (!role) return null;

  return (
    <>
      <button
        type="button"
        aria-label={open ? "إغلاق قائمة خِدمتي" : "فتح قائمة خِدمتي"}
        aria-expanded={open}
        aria-controls="khedmty-side-menu"
        onClick={() => setOpen((value) => !value)}
        className="fixed right-4 top-4 z-[70] inline-flex min-h-12 items-center gap-3 rounded-2xl border border-white/70 bg-white/90 px-3 py-2 text-[#14213d] shadow-lg backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
      >
        <span className="text-lg font-black tracking-tight">خِدمتي</span>
        <span className="ios-icon-glass h-9 w-9 rounded-xl">
          <UiIcon name={open ? "x" : "menu"} size={22} />
        </span>
      </button>

      {open && (
        <button
          type="button"
          aria-label="إغلاق القائمة"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[60] cursor-default bg-[#14213d]/35 backdrop-blur-[3px]"
        />
      )}

      <aside
        id="khedmty-side-menu"
        dir="rtl"
        aria-label="القائمة الرئيسية"
        aria-hidden={!open}
        className={`fixed right-0 top-0 z-[65] flex h-[100dvh] w-[min(84vw,320px)] flex-col border-l border-slate-100/80 bg-white/95 p-5 shadow-2xl backdrop-blur-2xl transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="mb-8 flex items-center justify-between border-b border-slate-100 pb-5">
          <div>
            <p className="text-xl font-black text-[#14213d]">خِدمتي</p>
            <p className="mt-1 text-xs text-slate-500">القائمة الرئيسية</p>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق القائمة" className="ios-icon-glass h-10 w-10 text-slate-600 hover:bg-orange-50">
            <UiIcon name="x" size={22} />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-2">
          {items[role].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex min-h-12 items-center gap-4 rounded-xl px-4 py-3 font-bold text-[#14213d] transition hover:bg-orange-50 hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              <span className="ios-icon-glass h-10 w-10">
                <UiIcon name={item.icon} size={20} />
              </span>
              <span>{item.label}</span>
              <span className="mr-auto text-slate-300"><UiIcon name="chevron-left" size={17} /></span>
            </Link>
          ))}
        </nav>

        <form action="/api/auth/logout" method="POST" className="border-t border-slate-100 pt-4">
          <button type="submit" className="flex min-h-12 w-full items-center gap-4 rounded-xl px-4 py-3 font-bold text-red-600 transition hover:bg-red-50">
            <span className="ios-icon-glass h-10 w-10 text-red-500"><UiIcon name="log-out" size={20} /></span>
            تسجيل الخروج
          </button>
        </form>
      </aside>
    </>
  );
}
