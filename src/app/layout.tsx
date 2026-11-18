import type { Metadata, Viewport } from "next";
import "./globals.css";

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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
