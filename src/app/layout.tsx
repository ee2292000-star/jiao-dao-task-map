import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "教導處任務地圖",
  description: "學校教導處任務管理平台範例"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
