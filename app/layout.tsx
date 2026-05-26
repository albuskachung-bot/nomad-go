import type { Metadata } from "next";
import "./globals.css";
import AppChrome from "@/components/AppChrome";

export const metadata: Metadata = {
  title: "NOMAD-GO 遊牧出發",
  description: "華語數位遊牧平台，整合遠端職缺、城市指南與實用工具。"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body className="min-h-screen bg-white font-sans text-gray-900 antialiased">
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
