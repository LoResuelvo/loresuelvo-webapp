import { Manrope } from "next/font/google";
import type { Metadata } from "next";
import { Auth0Provider } from "@auth0/nextjs-auth0/client";
import { getAuthService } from "@/infrastructure/auth";
import { WebSocketProvider } from "@/infrastructure/websocket";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "LoResuelvo",
  description: "Una aplicacion para contactar prestadores de servicios",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthService().getSession();
  const rawRole = session?.user?.role;
  const role = typeof rawRole === "string" ? rawRole : undefined;

  const apiUrl = process.env.API_URL || "http://localhost:8080";
  const wsUrl = apiUrl.replace(/^http/, "ws") + "/ws";

  return (
    <html lang="es-AR">
      <body className={manrope.className}>
        <Auth0Provider>
          <WebSocketProvider wsUrl={wsUrl} role={role} enabled={!!role}>
            {children}
          </WebSocketProvider>
        </Auth0Provider>
      </body>
    </html>
  );
}