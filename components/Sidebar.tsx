"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

type Project = { id: string; name: string; studentCount: number; groups: { maxStudents: number }[] };

// ─── SVG Icons ────────────────────────────────────────────────────────────────
function IconFolder() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  );
}
function IconPeople() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}
function IconSettings() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}
function IconChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  );
}
function IconPower() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/>
      <line x1="12" y1="2" x2="12" y2="12"/>
    </svg>
  );
}

// ─── Tooltip (shown in collapsed mode) ─────────────────────────────────────
function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ position: "relative", display: "flex" }} className="sb-tooltip-wrap">
      {children}
      <span className="sb-tooltip">{label}</span>
    </div>
  );
}

// ─── Nav Item ────────────────────────────────────────────────────────────────
function NavItem({
  href, label, icon, active, collapsed,
}: { href: string; label: string; icon: React.ReactNode; active: boolean; collapsed: boolean }) {
  const activeBg  = "rgba(255,255,255,0.10)";
  const activeCol = "rgba(255,255,255,0.95)";
  const mutedCol  = "rgba(255,255,255,0.45)";

  const inner = (
    <Link href={href} style={{
      display: "flex",
      alignItems: "center",
      justifyContent: collapsed ? "center" : "flex-start",
      gap: collapsed ? 0 : "var(--space-3)",
      padding: collapsed ? "var(--space-3)" : "var(--space-2) var(--space-3)",
      borderRadius: "var(--radius-md)",
      background: active ? activeBg : "transparent",
      color: active ? activeCol : mutedCol,
      textDecoration: "none",
      fontSize: "var(--text-sm)",
      fontWeight: active ? 600 : 400,
      width: "100%",
      transition: "background 180ms ease, color 180ms ease",
    }}>
      <span style={{ flexShrink: 0, display: "flex" }}>{icon}</span>
      {!collapsed && <span>{label}</span>}
    </Link>
  );

  return collapsed ? <Tooltip label={label}>{inner}</Tooltip> : inner;
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function Sidebar({ username, isSuperuser }: { username: string; isSuperuser: boolean }) {
  const [projects, setProjects]   = useState<Project[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/projects").then(r => r.ok ? r.json() : []).then(setProjects);
  }, [pathname]);

  const W          = collapsed ? 64 : 248;
  const borderC    = "rgba(255,255,255,0.06)";
  const mutedC     = "rgba(255,255,255,0.38)";
  const activeC    = "rgba(255,255,255,0.95)";
  const sectionC   = "rgba(255,255,255,0.25)";
  const initial    = username.charAt(0).toUpperCase();

  return (
    <>
      {/* ── Tooltip styles (injected once) ─────────────────────────────── */}
      <style>{`
        .sb-tooltip-wrap { position: relative; }
        .sb-tooltip {
          display: none;
          position: absolute;
          left: calc(100% + 10px);
          top: 50%;
          transform: translateY(-50%);
          background: rgba(30,29,27,0.96);
          color: rgba(255,255,255,0.9);
          font-size: 12px;
          font-weight: 500;
          padding: 4px 10px;
          border-radius: 8px;
          white-space: nowrap;
          pointer-events: none;
          z-index: 9999;
          box-shadow: 0 4px 16px rgba(0,0,0,0.32);
          letter-spacing: 0.01em;
        }
        .sb-tooltip-wrap:hover .sb-tooltip { display: block; }

        /* Smooth sidebar width transition */
        .sidebar-root {
          transition: width 260ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Fade out text labels when collapsing */
        .sidebar-label {
          overflow: hidden;
          white-space: nowrap;
          transition: opacity 200ms ease, max-width 260ms cubic-bezier(0.4,0,0.2,1);
        }
      `}</style>

      <aside
        className="sidebar-root"
        style={{
          width: W,
          flexShrink: 0,
          height: "100vh",
          overflowY: "auto",
          overflowX: "hidden",
          background: "#1c1b19",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          color: "white",
          padding: "var(--space-4) var(--space-2)",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          borderRight: `1px solid ${borderC}`,
          position: "sticky",
          top: 0,
        }}
      >

        {/* ── Top: Avatar + Toggle ───────────────────────────────────────── */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          padding: collapsed ? "var(--space-2) 0" : "var(--space-2) var(--space-2)",
          marginBottom: "var(--space-3)",
        }}>
          {/* Avatar */}
          {collapsed ? (
            <Tooltip label={username}>
              <div style={{
                width: 36, height: 36,
                borderRadius: "var(--radius-full)",
                background: "linear-gradient(135deg, var(--color-primary) 0%, #4f98a3 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: "0.95rem",
                color: "white",
                flexShrink: 0,
                cursor: "default",
                userSelect: "none",
              }}>
                {initial}
              </div>
            </Tooltip>
          ) : (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
              padding: "var(--space-2) var(--space-2)",
              background: "rgba(255,255,255,0.05)",
              borderRadius: "var(--radius-lg)",
              border: `1px solid ${borderC}`,
              flex: 1,
              marginRight: "var(--space-2)",
              minWidth: 0,
            }}>
              <div style={{
                width: 32, height: 32,
                borderRadius: "var(--radius-full)",
                background: "linear-gradient(135deg, var(--color-primary) 0%, #4f98a3 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: "0.85rem",
                color: "white",
                flexShrink: 0,
              }}>
                {initial}
              </div>
              <div style={{ overflow: "hidden", flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: "var(--text-sm)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: activeC }}>
                  {username}
                </div>
                <div style={{ fontSize: "var(--text-xs)", color: isSuperuser ? "var(--color-primary-highlight)" : mutedC, marginTop: 1 }}>
                  {isSuperuser ? "Super User" : "Lehrer"}
                </div>
              </div>
            </div>
          )}

          {/* Collapse toggle */}
          {!collapsed && (
            <button
              aria-label="Seitenleiste einklappen"
              onClick={() => setCollapsed(true)}
              style={{
                width: 28, height: 28,
                borderRadius: "var(--radius-full)",
                background: "rgba(255,255,255,0.06)",
                border: `1px solid ${borderC}`,
                color: mutedC,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                cursor: "pointer",
                transition: "background 180ms ease, color 180ms ease",
              }}
            >
              <IconChevronLeft />
            </button>
          )}

          {/* Expand toggle (only visible when collapsed) */}
          {collapsed && (
            <button
              aria-label="Seitenleiste ausklappen"
              onClick={() => setCollapsed(false)}
              style={{
                position: "absolute",
                bottom: 64,
                left: "50%",
                transform: "translateX(-50%) rotate(180deg)",
                width: 28, height: 28,
                borderRadius: "var(--radius-full)",
                background: "rgba(255,255,255,0.06)",
                border: `1px solid ${borderC}`,
                color: mutedC,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                cursor: "pointer",
                transition: "background 180ms ease, color 180ms ease",
              }}
            >
              <IconChevronLeft />
            </button>
          )}
        </div>

        {/* ── Navigation ────────────────────────────────────────────────── */}
        {!collapsed && (
          <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: sectionC, textTransform: "uppercase", letterSpacing: "0.09em", padding: "0 var(--space-3)", marginBottom: "var(--space-1)" }}>
            Navigation
          </div>
        )}

        <NavItem href="/projects" label="Projekte"      icon={<IconFolder />}   active={!!pathname?.startsWith("/projects")} collapsed={collapsed} />
        <NavItem href="/groups"   label="Gruppen"       icon={<IconPeople />}   active={!!pathname?.startsWith("/groups")}   collapsed={collapsed} />
        {isSuperuser && (
          <NavItem href="/settings" label="Einstellungen" icon={<IconSettings />} active={!!pathname?.startsWith("/settings")} collapsed={collapsed} />
        )}

        {/* ── Divider ───────────────────────────────────────────────────── */}
        <div style={{ height: 1, background: borderC, margin: `var(--space-3) var(--space-2)` }} />

        {/* ── Projects List (hidden when collapsed) ────────────────────── */}
        {!collapsed && (
          <div style={{ flex: 1, overflowY: "auto" }}>
            <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: sectionC, textTransform: "uppercase", letterSpacing: "0.09em", padding: "0 var(--space-3)", marginBottom: "var(--space-2)" }}>
              {isSuperuser ? "Alle Projekte" : "Meine Projekte"}
            </div>
            {projects.length === 0 && (
              <p style={{ fontSize: "var(--text-xs)", color: mutedC, padding: "0 var(--space-3)" }}>Keine Projekte.</p>
            )}
            {projects.map((p) => {
              const used = p.groups.reduce((sum, g) => sum + g.maxStudents, 0);
              const pct  = p.studentCount > 0 ? Math.min(100, (used / p.studentCount) * 100) : 0;
              return (
                <Link key={p.id} href={`/groups?projectId=${p.id}`} style={{
                  display: "block",
                  padding: "var(--space-2) var(--space-3)",
                  marginBottom: 2,
                  borderRadius: "var(--radius-md)",
                  background: "rgba(255,255,255,0.03)",
                  color: mutedC,
                  textDecoration: "none",
                  fontSize: "var(--text-xs)",
                }}>
                  <div style={{ fontWeight: 500, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: activeC }}>{p.name}</div>
                  <div style={{ height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 99 }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: "var(--color-primary)", borderRadius: 99, transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)" }} />
                  </div>
                  <div style={{ fontSize: "0.67rem", color: sectionC, marginTop: 3 }}>{used} / {p.studentCount} Schüler</div>
                </Link>
              );
            })}
          </div>
        )}

        {/* spacer when collapsed so logout stays at bottom */}
        {collapsed && <div style={{ flex: 1 }} />}

        {/* ── Sign Out ──────────────────────────────────────────────────── */}
        {collapsed ? (
          // Icon-only circle button when collapsed
          <Tooltip label="Abmelden">
            <button
              aria-label="Abmelden"
              onClick={() => signOut({ callbackUrl: "/lehrer" })}
              style={{
                width: 36, height: 36,
                borderRadius: "var(--radius-full)",
                background: "rgba(161,44,123,0.12)",
                border: "1px solid rgba(161,44,123,0.22)",
                color: "#d163a7",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                alignSelf: "center",
                marginBottom: "var(--space-2)",
                cursor: "pointer",
                transition: "background 180ms ease",
              }}
            >
              <IconPower />
            </button>
          </Tooltip>
        ) : (
          // Full-width button when expanded
          <button
            onClick={() => signOut({ callbackUrl: "/lehrer" })}
            style={{
              marginTop: "var(--space-2)",
              width: "100%",
              borderRadius: "var(--radius-md)",
              background: "rgba(161,44,123,0.12)",
              color: "#d163a7",
              border: "1px solid rgba(161,44,123,0.22)",
              boxShadow: "none",
              fontWeight: 600,
              fontSize: "var(--text-sm)",
              padding: "var(--space-2) var(--space-3)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-2)",
              transition: "background 180ms ease",
            }}
          >
            <IconPower />
            Abmelden
          </button>
        )}
      </aside>
    </>
  );
}
