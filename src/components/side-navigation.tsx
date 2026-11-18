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
  if (!role) return null;
  return (
    <nav aria-label="التنقل الرئيسي" dir="rtl" className="fixed right-2 top-1/2 z-50 flex -translate-y-1/2 flex-col gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-xl backdrop-blur sm:right-4">
      {items[role].map((item) => (
        <Link key={item.href} href={item.href} aria-label={item.label} title={item.label}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-[#14213d] transition hover:bg-orange-50 hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
          <UiIcon name={item.icon} size={21} />
        </Link>
      ))}
      <form action="/api/auth/logout" method="POST">
        <button type="submit" aria-label="تسجيل الخروج" title="تسجيل الخروج" className="flex h-11 w-11 items-center justify-center rounded-xl text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
          <UiIcon name="log-out" size={21} />
        </button>
      </form>
    </nav>
  );
}
