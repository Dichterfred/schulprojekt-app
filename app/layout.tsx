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
        <style>{`
          /* Mobile/Tablet Top-Bar — only visible below 1024px */
          .mobile-topbar {
            display: none;
          }
          @media (max-width: 1023px) {
            .mobile-topbar {
              display: flex;
              align-items: center;
              height: 56px;
              padding: 0 12px;
              background: #1c1b19;
              border-bottom: 1px solid rgba(255,255,255,0.07);
              flex-shrink: 0;
              gap: 12px;
              position: sticky;
              top: 0;
              z-index: 900;
            }
            .mobile-topbar-title {
              font-size: 16px;
              font-weight: 600;
              color: rgba(255,255,255,0.9);
              flex: 1;
            }
          }
        `}</style>
      </head>
      <body style={{ overflow: "hidden" }}>
        <Providers>
          {showSidebar ? (
            <div style={{ display: "flex", height: "100dvh", overflow: "hidden" }}>
              {/* Sidebar renders desktop sidebar + mobile drawer + hamburger button */}
              <Sidebar username={session!.user.name || ""} isSuperuser={session!.user.role === "SUPERUSER"} />
              {/* Main content — scrolls independently */}
              <main style={{
                flex: 1,
                overflowY: "auto",
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
              }}>
                {/*
                  Mobile/Tablet Top-Bar:
                  The #sb-hamburger-btn button is rendered by <Sidebar> and
                  moved here via CSS order trick — instead we use a label/slot
                  approach: Sidebar places the button with className sb-hamburger,
                  and on mobile we show this top-bar which contains it via portal.
                  Simpler: we render a static top-bar here and rely on the
                  sb-hamburger button that Sidebar renders being repositioned.
                  Since Next.js/React doesn't easily allow cross-component slot
                  injection without context, we use a clean CSS-only approach:
                  The Sidebar's sb-hamburger button gets position:fixed removed
                  and is instead shown inline inside this top-bar via a flex
                  container that wraps it. We achieve this by wrapping both
                  Sidebar output and TopBar in a column layout on mobile.
                */}
                <div className="mobile-topbar">
                  {/* The sb-hamburger button from Sidebar floats here via CSS reorder */}
                  <span style={{ display: "flex", alignItems: "center" }} id="mobile-topbar-hamburger-slot" />
                  <span className="mobile-topbar-title">Schulprojekt Verwaltung</span>
                </div>
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
