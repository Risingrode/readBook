import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Memory Reader - 沉浸式阅读器",
  description: "将阅读转化为交互式的认知体验。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className="h-full antialiased font-sans"
    >
      <body className="min-h-full flex flex-col bg-[#fafafa] dark:bg-[#050505] text-[#111] dark:text-[#eee]">
        {children}
      </body>
    </html>
  );
}
