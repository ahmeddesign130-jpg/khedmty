import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "خِدمتي — مهارتك تستحق التميز",
  description: "منصة خِدمتي للخدمات والعمل الحر"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
