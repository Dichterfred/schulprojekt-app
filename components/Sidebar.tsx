"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

type Project = { id: string; name: string; studentCount: number; groups: { maxStudents: number }[] };

// ─── SVG fix: reset max-width/height-auto from globals ───────────────────────
const SVG_RESET: React.CSSProperties = {
  display: "inline-block",
  flexShrink: 0,
  lineHeight: 0,
  width: undefined,
  height: undefined,
  maxWidth: "none",
};

// ─── Icons ────────────────────────────────────────────────────────────────────
function IconFolder() {
  return (
    <span style={SVG_RESET}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
    </span>
  );
}
function IconPeople() {
  return (
    <span style={SVG_RESET}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    </span>
  );
}
function IconSettings() {
  return (
    <span style={SVG_RESET}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    </span>
  );
}
function IconChevron({ rotated }: { rotated?: boolean }) {
  return (
    <span style={{ ...SVG_RESET, transform: rotated ? "rotate(180deg)" : undefined, display: "inline-flex" }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
        <polyline points="15 18 9 12 15 6"/>
      </svg>
    </span>
  );
}
function IconPower() {
  return (
    <span style={SVG_RESET}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
        <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/>
        <line x1="12" y1="2" x2="12" y2="12"/>
      </svg>
    </span>
  );
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────
function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="sb-tooltip-wrap" style={{ position: "relative", display: "flex", width: "100%", justifyContent: "center" }}>
      {children}
      <span className="sb-tooltip">{label}</span>
    </div>
  );
}

// ─── Nav Item ────────────────────────────────────────────────────────────────
function NavItem({
  href, label, icon, active, collapsed,
}: { href: string; label: string; icon: React.ReactNode; active: boolean; collapsed: boolean }) {
  const inner = (
    <Link href={href} style={{
      display: "flex",
      alignItems: "center",
      justifyContent: collapsed ? "center" : "flex-start",
      gap: collapsed ? 0 : "10px",
      padding: collapsed ? "10px" : "8px 12px",
      borderRadius: "8px",
      background: active ? "rgba(255,255,255,0.10)" : "transparent",
      color: active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.45)",
      textDecoration: "none",
      fontSize: "14px",
      fontWeight: active ? 600 : 400,
      width: "100%",
      transition: "background 180ms ease, color 180ms ease",
      lineHeight: 1,
    }}>
      {icon}
      {!collapsed && <span style={{ lineHeight: 1.4 }}>{label}</span>}
    </Link>
  );
  return collapsed ? <Tooltip label={label}>{inner}</Tooltip> : inner;
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
export default function Sidebar({ username, isSuperuser }: { username: string; isSuperuser: boolean }) {
  const [projects, setProjects]   = useState<Project[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/projects").then(r => r.ok ? r.json() : []).then(setProjects);
  }, [pathname]);

  const borderC  = "rgba(255,255,255,0.06)";
  const mutedC   = "rgba(255,255,255,0.38)";
  const activeC  = "rgba(255,255,255,0.95)";
  const sectionC = "rgba(255,255,255,0.25)";
  const initial  = username.charAt(0).toUpperCase();

  // shared style for collapse/expand circle buttons
  const toggleBtnStyle: React.CSSProperties = {
    width: 28, height: 28,
    borderRadius: "9999px",
    background: "rgba(255,255,255,0.06)",
    border: `1px solid ${borderC}`,
    color: "rgba(255,255,255,0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    cursor: "pointer",
    padding: 0,
    lineHeight: 0,
    transition: "background 180ms ease, color 180ms ease",
  };

  return (
    <>
      <style>{`
        .sb-tooltip-wrap { position: relative; }
        .sb-tooltip {
          display: none;
          position: absolute;
          left: calc(100% + 10px);
          top: 50%;
          transform: translateY(-50%);
          background: rgba(22,21,19,0.97);
          color: rgba(255,255,255,0.9);
          font-size: 12px;
          font-weight: 500;
          padding: 4px 10px;
          border-radius: 8px;
          white-space: nowrap;
          pointer-events: none;
          z-index: 9999;
          box-shadow: 0 4px 16px rgba(0,0,0,0.4);
        }
        .sb-tooltip-wrap:hover .sb-tooltip { display: block; }
        .sidebar-root { transition: width 260ms cubic-bezier(0.4,0,0.2,1); }
        /* prevent globals img rule from breaking SVGs inside sidebar */
        .sidebar-root svg { display: block; max-width: none; height: auto; }
      `}</style>

      <aside
        className="sidebar-root"
        style={{
          width: collapsed ? 64 : 248,
          flexShrink: 0,
          height: "100vh",
          overflowY: "auto",
          overflowX: "hidden",
          background: "#1c1b19",
          color: "white",
          padding: "16px 8px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          borderRight: `1px solid ${borderC}`,
          position: "sticky",
          top: 0,
        }}
      >

        {/* ── Top row: avatar card (expanded) / avatar circle (collapsed) + toggle ── */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          marginBottom: 12,
          padding: collapsed ? "4px 0" : "4px 4px",
        }}>
          {collapsed ? (
            /* Avatar-only circle with tooltip */
            <Tooltip label={username}>
              <div style={{
                width: 36, height: 36,
                borderRadius: "9999px",
                background: "linear-gradient(135deg, var(--color-primary,#01696f) 0%, #4f98a3 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: "15px", color: "white",
                flexShrink: 0, cursor: "default", userSelect: "none",
                lineHeight: 1,
              }}>
                {initial}
              </div>
            </Tooltip>
          ) : (
            <>
              {/* Avatar card */}
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 10px",
                background: "rgba(255,255,255,0.05)",
                borderRadius: 12,
                border: `1px solid ${borderC}`,
                flex: 1, minWidth: 0,
                marginRight: 8,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "9999px",
                  background: "linear-gradient(135deg, var(--color-primary,#01696f) 0%, #4f98a3 100%)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: "13px", color: "white", flexShrink: 0, lineHeight: 1,
                }}>
                  {initial}
                </div>
                <div style={{ overflow: "hidden", flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: "14px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: activeC, lineHeight: 1.3 }}>
                    {username}
                  </div>
                  <div style={{ fontSize: "11px", color: isSuperuser ? "var(--color-primary-highlight,#cedcd8)" : mutedC, marginTop: 2, lineHeight: 1 }}>
                    {isSuperuser ? "Super User" : "Lehrer"}
                  </div>
                </div>
              </div>
              {/* Collapse button */}
              <button aria-label="Seitenleiste einklappen" onClick={() => setCollapsed(true)} style={toggleBtnStyle}>
                <IconChevron />
              </button>
            </>
          )}
        </div>

        {/* Expand button row — only shown when collapsed, below avatar */}
        {collapsed && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
            <Tooltip label="Ausklappen">
              <button aria-label="Seitenleiste ausklappen" onClick={() => setCollapsed(false)} style={toggleBtnStyle}>
                <IconChevron rotated />
              </button>
            </Tooltip>
          </div>
        )}

        {/* ── Section label ── */}
        {!collapsed && (
          <div style={{ fontSize: "11px", fontWeight: 700, color: sectionC, textTransform: "uppercase", letterSpacing: "0.09em", padding: "0 12px", marginBottom: 4 }}>
            Navigation
          </div>
        )}

        {/* ── Nav items ── */}
        <NavItem href="/projects"  label="Projekte"       icon={<IconFolder />}   active={!!pathname?.startsWith("/projects")}  collapsed={collapsed} />
        <NavItem href="/groups"    label="Gruppen"        icon={<IconPeople />}   active={!!pathname?.startsWith("/groups")}    collapsed={collapsed} />
        {isSuperuser && (
          <NavItem href="/settings" label="Einstellungen"  icon={<IconSettings />} active={!!pathname?.startsWith("/settings")}  collapsed={collapsed} />
        )}

        {/* ── Divider ── */}
        <div style={{ height: 1, background: borderC, margin: "12px 8px" }} />

        {/* ── Project list (hidden when collapsed) ── */}
        {!collapsed && (
          <div style={{ flex: 1, overflowY: "auto" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: sectionC, textTransform: "uppercase", letterSpacing: "0.09em", padding: "0 12px", marginBottom: 8 }}>
              {isSuperuser ? "Alle Projekte" : "Meine Projekte"}
            </div>
            {projects.length === 0 && (
              <p style={{ fontSize: "12px", color: mutedC, padding: "0 12px" }}>Keine Projekte.</p>
            )}
            {projects.map((p) => {
              const used = p.groups.reduce((sum, g) => sum + g.maxStudents, 0);
              const pct  = p.studentCount > 0 ? Math.min(100, (used / p.studentCount) * 100) : 0;
              return (
                <Link key={p.id} href={`/groups?projectId=${p.id}`} style={{
                  display: "block", padding: "8px 12px", marginBottom: 2,
                  borderRadius: 8, background: "rgba(255,255,255,0.03)",
                  color: mutedC, textDecoration: "none", fontSize: "12px",
                }}>
                  <div style={{ fontWeight: 500, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: activeC }}>{p.name}</div>
                  <div style={{ height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 99 }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: "var(--color-primary,#01696f)", borderRadius: 99, transition: "width 0.5s ease" }} />
                  </div>
                  <div style={{ fontSize: "10px", color: sectionC, marginTop: 3 }}>{used} / {p.studentCount} Schüler</div>
                </Link>
              );
            })}
          </div>
        )}

        {/* spacer pushes logout to bottom when collapsed */}
        {collapsed && <div style={{ flex: 1 }} />}

        {/* ── Logout ── */}
        {collapsed ? (
          <Tooltip label="Abmelden">
            <button
              aria-label="Abmelden"
              onClick={() => signOut({ callbackUrl: "/lehrer" })}
              style={{
                width: 36, height: 36,
                borderRadius: "9999px",
                background: "rgba(161,44,123,0.12)",
                border: "1px solid rgba(161,44,123,0.22)",
                color: "#d163a7",
                display: "flex", alignItems: "center", justifyContent: "center",
                alignSelf: "center",
                marginBottom: 8,
                cursor: "pointer",
                padding: 0,
                lineHeight: 0,
                transition: "background 180ms ease",
              }}
            >
              <IconPower />
            </button>
          </Tooltip>
        ) : (
          <button
            onClick={() => signOut({ callbackUrl: "/lehrer" })}
            style={{
              marginTop: 8,
              width: "100%",
              borderRadius: 8,
              background: "rgba(161,44,123,0.12)",
              color: "#d163a7",
              border: "1px solid rgba(161,44,123,0.22)",
              fontWeight: 600,
              fontSize: "14px",
              padding: "8px 12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              lineHeight: 1,
              transition: "background 180ms ease",
            }}
          >
            <IconPower />
            <span>Abmelden</span>
          </button>
        )}
      </aside>
    </>
  );
}
