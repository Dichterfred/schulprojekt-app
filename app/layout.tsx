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
      <body>
        <Providers>
          {showSidebar ? (
            <div style={{ display: "flex", minHeight: "100vh" }}>
              <Sidebar username={session!.user.name || ""} isSuperuser={session!.user.role === "SUPERUSER"} />
              <main style={{
                flex: 1,
                padding: "2rem 2.5rem",
                maxWidth: 900,
                marginLeft: 0,
              }}>{children}</main>
            </div>
          ) : (
            <main>{children}</main>
          )}
          <LegalFooter />
        </Providers>
      </body>
    </html>
  );
}
