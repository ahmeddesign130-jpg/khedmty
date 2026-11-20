import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { SideNavigation } from "@/components/side-navigation";
import { PreferenceInitializer } from "@/components/preference-initializer";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "خِدمتي | مهارتك تستحق التميز",
  description: "منصة خِدمتي للخدمات المستقلة، تجمع العملاء بمقدمي الخدمات المحترفين.",
  applicationName: "Khedmty",
  metadataBase: new URL("https://khedmty-swart.vercel.app"),
  openGraph: {
    title: "خِدمتي | مهارتك تستحق التميز",
    description: "منصة موثوقة للخدمات المستقلة.",
    siteName: "خِدمتي",
    locale: "ar_EG",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#14213D",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  const activeRole = user?.status === "ACTIVE" ? user.role : null;
  return (
    <html lang="ar" dir="rtl">
      <body className={activeRole ? "has-side-navigation" : undefined}>
        <PreferenceInitializer userId={user?.id ?? "guest"} />
        <Link href="/" aria-label="خِدمتي - الصفحة الرئيسية" className="khedmty-global-brand text-xl font-black leading-none tracking-normal sm:text-2xl">خِدمتي</Link>
        {children}
        <footer className="site-creator-footer" dir="ltr" aria-label="Website creator">
          <span>AHMED ZAKRAIA ALI</span>
          <a
            href="https://www.tiktok.com/@ahahmed130"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="تابع خِدمتي على تيك توك"
            className="mr-3 inline-flex items-center rounded-full border border-current/20 px-3 py-1 text-xs font-bold transition hover:opacity-75"
          >
            TikTok @ahahmed130
          </a>
        </footer>
        <SideNavigation role={activeRole} userId={user?.id ?? "guest"} />
      </body>
    </html>
  );
}
