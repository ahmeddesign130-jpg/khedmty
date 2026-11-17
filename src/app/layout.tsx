
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "خِدمتي | مهارتك تستحق التميز",
  description:
    "منصة خِدمتي للخدمات المستقلة، تجمع العملاء بمقدمي الخدمات المحترفين.",
  applicationName: "Khedmty",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F97316",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
