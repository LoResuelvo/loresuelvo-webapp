import type { Metadata } from "next";
import { ConfigProvider } from "./config-provider";

import "./globals.css";

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
    <html lang="en">
      <body>
        <ConfigProvider config={envConfig}>
          {children}
        </ConfigProvider>
      </body>
    </html>
  );
}
