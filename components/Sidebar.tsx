"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

type Project = { id: string; name: string; studentCount: number; groups: { maxStudents: number }[] };

const SVG_RESET: React.CSSProperties = {
  display: "inline-block", flexShrink: 0, lineHeight: 0, maxWidth: "none",
};

function IconFolder() {
  return <span style={SVG_RESET}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg></span>;
}
function IconPeople() {
  return <span style={SVG_RESET}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg></span>;
}
function IconSettings() {
  return <span style={SVG_RESET}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg></span>;
}
function IconChevronLeft() {
  return <span style={SVG_RESET}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}><polyline points="15 18 9 12 15 6" /></svg></span>;
}
function IconChevronRight() {
  return <span style={SVG_RESET}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}><polyline points="9 18 15 12 9 6" /></svg></span>;
}
function IconPower() {
  return <span style={SVG_RESET}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}><path d="M18.36 6.64a9 9 0 1 1-12.73 0" /><line x1="12" y1="2" x2="12" y2="12" /></svg></span>;
}
function IconMenu() {
  return <span style={SVG_RESET}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg></span>;
}
function IconX() {
  return <span style={SVG_RESET}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></span>;
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setDrawerOpen(false); }, [pathname]);
  useEffect(() => {
    fetch("/api/projects").then(r => r.ok ? r.json() : []).then(setProjects);
  }, [pathname]);

  const bc = "rgba(255,255,255,0.07)";
  const muted = "rgba(255,255,255,0.40)";
  const active = "rgba(255,255,255,0.95)";
  const sec = "rgba(255,255,255,0.26)";
  const initial = username.charAt(0).toUpperCase();

  const handleLogout = () => signOut({ callbackUrl: "/lehrer" });

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

      <NavItem href="/projects" label="Projekte"      icon={<IconFolder />}   active={!!pathname?.startsWith("/projects")} collapsed={!isMobile && collapsed} onClick={() => setDrawerOpen(false)} />
      <NavItem href="/groups"   label="Gruppen"       icon={<IconPeople />}   active={!!pathname?.startsWith("/groups")}   collapsed={!isMobile && collapsed} onClick={() => setDrawerOpen(false)} />
      {isSuperuser && (
        <NavItem href="/settings" label="Einstellungen" icon={<IconSettings />} active={!!pathname?.startsWith("/settings")} collapsed={!isMobile && collapsed} onClick={() => setDrawerOpen(false)} />
      )}

      <div style={{ height: 1, background: bc, margin: "12px 8px" }} />

      {(isMobile || !collapsed) && (
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: sec, textTransform: "uppercase", letterSpacing: "0.09em", padding: "0 12px", marginBottom: 8 }}>
            {isSuperuser ? "Alle Projekte" : "Meine Projekte"}
          </div>
          {projects.length === 0 && (
            <p style={{ fontSize: "12px", color: muted, padding: "0 12px" }}>Keine Projekte.</p>
          )}
          {projects.map((p) => {
            const used = p.groups.reduce((s, g) => s + g.maxStudents, 0);
            const pct = p.studentCount > 0 ? Math.min(100, (used / p.studentCount) * 100) : 0;
            return (
              <Link key={p.id} href={`/groups?projectId=${p.id}`} onClick={() => setDrawerOpen(false)} style={{
                display: "block", padding: "8px 12px", marginBottom: 2,
                borderRadius: 8, background: "rgba(255,255,255,0.03)",
                color: muted, textDecoration: "none", fontSize: "12px",
              }}>
                <div style={{ fontWeight: 500, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: active }}>{p.name}</div>
                <div style={{ height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 99 }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: "var(--color-primary,#01696f)", borderRadius: 99, transition: "width 0.5s ease" }} />
                </div>
                <div style={{ fontSize: "10px", color: sec, marginTop: 3 }}>{used} / {p.studentCount} Schüler</div>
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

        /* Hamburger: sitzt in der mobilen Top-Bar (kein fixed positioning mehr) */
        .sb-hamburger {
          display: none;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: transparent;
          border: none;
          color: rgba(255,255,255,0.9);
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 0;
          line-height: 0;
          flex-shrink: 0;
          transition: background 160ms;
        }
        .sb-hamburger:hover {
          background: rgba(255,255,255,0.08);
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

        @media (max-width: 1023px) {
          .sb-desktop { display: none !important; }
          .sb-hamburger { display: flex; }
          .sb-overlay { display: block; }
        }
      `}</style>

      {/* Desktop sidebar */}
      <div className="sb-desktop">
        {panelContent(false)}
      </div>

      {/* Mobile/Tablet: Hamburger button (rendered inside TopBar via prop) */}
      <button
        className="sb-hamburger"
        data-open={drawerOpen ? "true" : "false"}
        aria-label="Menü öffnen"
        onClick={() => setDrawerOpen(true)}
        id="sb-hamburger-btn"
      >
        <IconMenu />
      </button>

      {/* Mobile: Overlay + Drawer */}
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
