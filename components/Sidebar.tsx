"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { formatDateOnly } from "@/lib/dateHelpers";
import {
  Bars3Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
  FolderIcon,
  PowerIcon,
  UsersIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

type ProjectDaySummary = { id: string; name: string; startDate: string; endDate: string };

const SVG_RESET: React.CSSProperties = {
  display: "inline-block", flexShrink: 0, lineHeight: 0, maxWidth: "none",
};

function IconFolder() {
  return <span style={SVG_RESET}><FolderIcon width={20} height={20} style={{ display: "block" }} aria-hidden="true" /></span>;
}
function IconPeople() {
  return <span style={SVG_RESET}><UsersIcon width={20} height={20} style={{ display: "block" }} aria-hidden="true" /></span>;
}
function IconSettings() {
  return <span style={SVG_RESET}><Cog6ToothIcon width={20} height={20} style={{ display: "block" }} aria-hidden="true" /></span>;
}
function IconChevronLeft() {
  return <span style={SVG_RESET}><ChevronLeftIcon width={16} height={16} style={{ display: "block" }} aria-hidden="true" /></span>;
}
function IconChevronRight() {
  return <span style={SVG_RESET}><ChevronRightIcon width={16} height={16} style={{ display: "block" }} aria-hidden="true" /></span>;
}
function IconPower() {
  return <span style={SVG_RESET}><PowerIcon width={16} height={16} style={{ display: "block" }} aria-hidden="true" /></span>;
}
function IconMenu() {
  return <span style={SVG_RESET}><Bars3Icon width={22} height={22} style={{ display: "block" }} aria-hidden="true" /></span>;
}
function IconX() {
  return <span style={SVG_RESET}><XMarkIcon width={20} height={20} style={{ display: "block" }} aria-hidden="true" /></span>;
}

function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="sb-tip-wrap">
      {children}
      <span className="sb-tip">{label}</span>
    </div>
  );
}

function NavItem({
  href, label, icon, active, collapsed, onClick,
}: { href: string; label: string; icon: React.ReactNode; active: boolean; collapsed: boolean; onClick?: () => void }) {
  const link = (
    <Link href={href} onClick={onClick} style={{
      display: "flex",
      alignItems: "center",
      justifyContent: collapsed ? "center" : "flex-start",
      gap: collapsed ? 0 : "10px",
      padding: collapsed ? "10px" : "9px 12px",
      borderRadius: "8px",
      background: active ? "rgba(255,255,255,0.10)" : "transparent",
      color: active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.50)",
      textDecoration: "none",
      fontSize: "14px",
      fontWeight: active ? 600 : 400,
      width: "100%",
      transition: "background 160ms, color 160ms",
      lineHeight: 1,
    }}>
      {icon}
      {!collapsed && <span style={{ lineHeight: 1.35 }}>{label}</span>}
    </Link>
  );
  return collapsed ? <Tooltip label={label}>{link}</Tooltip> : link;
}

export default function Sidebar({ username, isSuperuser }: { username: string; isSuperuser: boolean }) {
  const [projectDays, setProjectDays] = useState<ProjectDaySummary[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setDrawerOpen(false); }, [pathname]);
  useEffect(() => {
    fetch("/api/project-days").then(r => r.ok ? r.json() : []).then(setProjectDays);
  }, [pathname]);

  const bc = "rgba(255,255,255,0.07)";
  const muted = "rgba(255,255,255,0.40)";
  const active = "rgba(255,255,255,0.95)";
  const sec = "rgba(255,255,255,0.26)";
  const initial = username.charAt(0).toUpperCase();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    window.location.href = "/lehrer";
  };

  const circleBtn: React.CSSProperties = {
    width: 28, height: 28, borderRadius: "9999px",
    background: "rgba(255,255,255,0.06)",
    border: `1px solid ${bc}`,
    color: "rgba(255,255,255,0.55)",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0, cursor: "pointer", padding: 0, lineHeight: 0,
    transition: "background 160ms",
  };

  const panelContent = (isMobile: boolean) => (
    <aside style={{
      width: isMobile ? "100%" : collapsed ? 64 : 248,
      height: "100%",
      overflowY: "auto", overflowX: "hidden",
      background: "#1c1b19",
      color: "white",
      padding: "16px 8px",
      display: "flex", flexDirection: "column", gap: 2,
      borderRight: isMobile ? "none" : `1px solid ${bc}`,
      transition: isMobile ? "none" : "width 260ms cubic-bezier(0.4,0,0.2,1)",
    }}>

      {/* Header row */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: (!isMobile && collapsed) ? "center" : "space-between",
        marginBottom: 12,
        padding: (!isMobile && collapsed) ? "4px 0" : "4px 4px",
      }}>
        {(!isMobile && collapsed) ? (
          <Tooltip label={username}>
            <div style={{
              width: 36, height: 36, borderRadius: "9999px",
              background: "linear-gradient(135deg,var(--color-primary,#01696f) 0%,#4f98a3 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: "15px", color: "white",
              flexShrink: 0, cursor: "default", userSelect: "none", lineHeight: 1,
            }}>{initial}</div>
          </Tooltip>
        ) : (
          <>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 10px",
              background: "rgba(255,255,255,0.05)",
              borderRadius: 12,
              border: `1px solid ${bc}`,
              flex: 1, minWidth: 0,
              marginRight: isMobile ? 0 : 8,
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: "9999px",
                background: "linear-gradient(135deg,var(--color-primary,#01696f) 0%,#4f98a3 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: "14px", color: "white", flexShrink: 0, lineHeight: 1,
              }}>{initial}</div>
              <div style={{ overflow: "hidden", flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: "14px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: active, lineHeight: 1.3 }}>{username}</div>
                <div style={{ fontSize: "11px", color: isSuperuser ? "var(--color-primary-highlight,#cedcd8)" : muted, marginTop: 2, lineHeight: 1 }}>
                  {isSuperuser ? "Super User" : "Lehrer"}
                </div>
              </div>
            </div>
            {isMobile ? (
              <button aria-label="Menü schließen" onClick={() => setDrawerOpen(false)} style={{ ...circleBtn, marginLeft: 8, width: 36, height: 36 }}>
                <IconX />
              </button>
            ) : (
              <button aria-label="Einklappen" onClick={() => setCollapsed(true)} style={circleBtn}>
                <IconChevronLeft />
              </button>
            )}
          </>
        )}
      </div>

      {/* Expand button (desktop collapsed only) */}
      {!isMobile && collapsed && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
          <Tooltip label="Ausklappen">
            <button aria-label="Ausklappen" onClick={() => setCollapsed(false)} style={circleBtn}>
              <IconChevronRight />
            </button>
          </Tooltip>
        </div>
      )}

      {(isMobile || !collapsed) && (
        <div style={{ fontSize: "11px", fontWeight: 700, color: sec, textTransform: "uppercase", letterSpacing: "0.09em", padding: "0 12px", marginBottom: 4 }}>
          Navigation
        </div>
      )}

      <NavItem href="/projekttage" label="Projekttage" icon={<IconFolder />} active={!!pathname?.startsWith("/projekttage")} collapsed={!isMobile && collapsed} onClick={() => setDrawerOpen(false)} />
      {isSuperuser && (
        <NavItem href="/schueler-verwaltung" label="Schüler" icon={<IconPeople />} active={!!pathname?.startsWith("/schueler-verwaltung")} collapsed={!isMobile && collapsed} onClick={() => setDrawerOpen(false)} />
      )}
      {isSuperuser && (
        <NavItem href="/settings" label="Einstellungen" icon={<IconSettings />} active={!!pathname?.startsWith("/settings")} collapsed={!isMobile && collapsed} onClick={() => setDrawerOpen(false)} />
      )}

      <div style={{ height: 1, background: bc, margin: "12px 8px" }} />

      {(isMobile || !collapsed) && (
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: sec, textTransform: "uppercase", letterSpacing: "0.09em", padding: "0 12px", marginBottom: 8 }}>
            Projekttage
          </div>
          {projectDays.length === 0 && (
            <p style={{ fontSize: "12px", color: muted, padding: "0 12px" }}>Keine Projekttage.</p>
          )}
          {projectDays.map((d) => {
            const isActive = pathname === `/projekttage/${d.id}` || !!pathname?.startsWith(`/projekttage/${d.id}/`);
            return (
              <Link key={d.id} href={`/projekttage/${d.id}`} onClick={() => setDrawerOpen(false)} style={{
                display: "block", padding: "8px 12px", marginBottom: 2,
                borderRadius: 8, background: isActive ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
                color: muted, textDecoration: "none", fontSize: "12px",
              }}>
                <div style={{ fontWeight: 500, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: active }}>{d.name}</div>
                <div style={{ fontSize: "10px", color: sec }}>{formatDateOnly(d.startDate)} – {formatDateOnly(d.endDate)}</div>
              </Link>
            );
          })}
        </div>
      )}

      {!isMobile && collapsed && <div style={{ flex: 1 }} />}

      {(!isMobile && collapsed) ? (
        <Tooltip label="Abmelden">
          <button aria-label="Abmelden" onClick={handleLogout} style={{
            width: 36, height: 36, borderRadius: "9999px",
            background: "rgba(161,44,123,0.12)", border: "1px solid rgba(161,44,123,0.22)",
            color: "#d163a7", display: "flex", alignItems: "center", justifyContent: "center",
            alignSelf: "center", marginBottom: 8, cursor: "pointer", padding: 0, lineHeight: 0,
          }}>
            <IconPower />
          </button>
        </Tooltip>
      ) : (
        <button onClick={handleLogout} style={{
          marginTop: 8, width: "100%", borderRadius: 8,
          background: "rgba(161,44,123,0.12)", color: "#d163a7",
          border: "1px solid rgba(161,44,123,0.22)",
          fontWeight: 600, fontSize: "14px", padding: "10px 12px",
          cursor: "pointer", display: "flex", alignItems: "center",
          justifyContent: "center", gap: 8, lineHeight: 1,
          paddingBottom: isMobile ? "calc(10px + env(safe-area-inset-bottom, 0px))" : "10px",
        }}>
          <IconPower />
          <span>Abmelden</span>
        </button>
      )}
    </aside>
  );

  return (
    <>
      <style>{`
        .sb-tip-wrap { position: relative; display: flex; width: 100%; justify-content: center; }
        .sb-tip {
          display: none; position: absolute;
          left: calc(100% + 10px); top: 50%; transform: translateY(-50%);
          background: rgba(22,21,19,0.97); color: rgba(255,255,255,0.9);
          font-size: 12px; font-weight: 500; padding: 4px 10px;
          border-radius: 8px; white-space: nowrap; pointer-events: none;
          z-index: 9999; box-shadow: 0 4px 16px rgba(0,0,0,0.4);
        }
        .sb-tip-wrap:hover .sb-tip { display: block; }

        .sb-desktop { display: flex; }

        /*
          Hamburger: position fixed, vertikal zentriert in der .top-bar (52px hoch).
          Position unveraendert. Nur Styling angepasst nach Apple HIG:
          - Hintergrund: primary-highlight (#cedcd8) — sichtbar auf hellem top-bar
          - Icon-Farbe: primary (#01696f)
          - Border: 1px solid primary mit 25% Opacity
          - Border-Radius: 12px (--radius-lg)
          - Shadow: shadow-sm
        */
        .sb-hamburger {
          display: none;
          position: fixed;
          top: 4px;
          left: 8px;
          z-index: 1200;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: var(--color-primary-highlight, #cedcd8);
          border: 1px solid rgba(1, 105, 111, 0.25);
          color: var(--color-primary, #01696f);
          box-shadow: 0 1px 2px rgba(40, 37, 29, 0.06), 0 1px 3px rgba(40, 37, 29, 0.04);
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 0;
          line-height: 0;
          transition: background var(--transition, 180ms cubic-bezier(0.16,1,0.3,1)),
                      box-shadow var(--transition, 180ms cubic-bezier(0.16,1,0.3,1));
          -webkit-tap-highlight-color: transparent;
        }
        .sb-hamburger:hover {
          background: #b8cecc;
          box-shadow: 0 4px 12px rgba(40, 37, 29, 0.08), 0 1px 4px rgba(40, 37, 29, 0.04);
        }
        .sb-hamburger:active {
          opacity: 0.88;
          transform: scale(0.97);
        }
        .sb-hamburger[data-open="true"] {
          opacity: 0;
          pointer-events: none;
        }

        .sb-overlay {
          display: none;
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(3px);
          -webkit-backdrop-filter: blur(3px);
          z-index: 1100;
        }
        .sb-drawer {
          position: fixed;
          top: 0; left: 0;
          width: min(300px, 85vw);
          height: 100dvh;
          z-index: 1150;
          overflow: hidden;
        }

        @media (max-width: 767px) {
          .sb-desktop { display: none !important; }
          .sb-hamburger { display: flex; }
          .sb-overlay { display: block; }
        }

        @media (min-width: 768px) and (max-width: 1023px) {
          .sb-desktop { display: none !important; }
          .sb-hamburger { display: flex; }
          .sb-overlay { display: block; }
        }
      `}</style>

      {/* Desktop sidebar */}
      <div className="sb-desktop">
        {panelContent(false)}
      </div>

      {/* Mobile/Tablet: Hamburger — sitzt visuell in der Top-Bar */}
      <button
        className="sb-hamburger"
        data-open={drawerOpen ? "true" : "false"}
        aria-label="Menü öffnen"
        onClick={() => setDrawerOpen(true)}
      >
        <IconMenu />
      </button>

      {/* Mobile/Tablet: Overlay + Drawer */}
      {drawerOpen && (
        <>
          <div className="sb-overlay" onClick={() => setDrawerOpen(false)} aria-hidden />
          <div className="sb-drawer">
            {panelContent(true)}
          </div>
        </>
      )}
    </>
  );
}
