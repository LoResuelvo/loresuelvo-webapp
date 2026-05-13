import type { Metadata } from "next";
import { ConfigProvider } from "./config-provider";

import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lo Resuelvo",
  description: "Lo Resuelvo web app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const envConfig = {
    apiUrl: process.env.API_URL || "http://localhost:8080",
  };

  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body>
        <ConfigProvider config={envConfig}>
          {children}
        </ConfigProvider>
      </body>
    </html>
  );
}
