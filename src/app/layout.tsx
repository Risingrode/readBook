import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Memory Reader - Cognitive Gamification",
  description: "Transforming reading into an interactive cognitive experience.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased font-sans"
    >
      <body className="min-h-full flex flex-col bg-[#fafafa] dark:bg-[#050505] text-[#111] dark:text-[#eee]">
        {children}
      </body>
    </html>
  );
}
