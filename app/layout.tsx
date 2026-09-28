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
      <div
          style={{
            position: "fixed",
            bottom: "1rem",
            right: "1rem",
            display: "flex",
            gap: "1rem",
            fontSize: "0.8rem",
            zIndex: 1000,
            background: "rgba(255, 255, 255, 0.85)",
            padding: "0.25rem 0.75rem",
            borderRadius: "0.5rem",
          }}
      >
          <Link href="/impressum">Impressum</Link>
        <Link href="/datenschutz">Datenschutz</Link>
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
              <main style={{ flex: 1, padding: "2rem" }}>{children}</main>
            </div>
          ) : (
            <main>{children}</main>
          )}
          <LegalFooter/>
        </Providers>
      </body>
    </html>
  );
}
