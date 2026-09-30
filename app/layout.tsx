import "./globals.css";
import type { ReactNode } from "react";
import Providers from "./providers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";

export const metadata = {
  title: "Schulprojekt Verwaltung",
  description: "Projekte und Gruppen verwalten",
};

function LegalFooter() {
  return (
    <div style={{
      position: "fixed",
      bottom: "1rem",
      right: "1rem",
      display: "flex",
      gap: "1rem",
      fontSize: "0.75rem",
      zIndex: 1000,
      background: "rgba(255,255,255,0.75)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      padding: "0.3rem 0.85rem",
      borderRadius: "20px",
      border: "1px solid rgba(0,0,0,0.08)",
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      color: "#6C6C70",
    }}>
      <Link href="/impressum" style={{ color: "#6C6C70", textDecoration: "none" }}>Impressum</Link>
      <Link href="/datenschutz" style={{ color: "#6C6C70", textDecoration: "none" }}>Datenschutz</Link>
    </div>
  );
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  const showSidebar = !!session && session.user.role !== "STUDENT";

  return (
    <html lang="de">
      {/* viewport meta for proper mobile scaling */}
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body style={{ overflow: "hidden" }}>
        <Providers>
          {showSidebar ? (
            <div style={{ display: "flex", height: "100dvh", overflow: "hidden" }}>
              {/* Sidebar renders its own mobile toggle + drawer */}
              <Sidebar username={session!.user.name || ""} isSuperuser={session!.user.role === "SUPERUSER"} />
              {/* Main content — scrolls independently */}
              <main style={{
                flex: 1,
                overflowY: "auto",
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                /* On mobile, sidebar is a drawer overlay — main takes full width */
              }}>
                {children}
              </main>
            </div>
          ) : (
            <main style={{ minHeight: "100dvh" }}>{children}</main>
          )}
          <LegalFooter />
        </Providers>
      </body>
    </html>
  );
}
