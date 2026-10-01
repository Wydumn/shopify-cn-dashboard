import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shopify CN Dashboard",
  description: "Shopify 数据看板 — 国内视角的电商数据分析工具",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
