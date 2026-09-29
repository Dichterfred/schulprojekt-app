"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

type Project = { id: string; name: string; studentCount: number; groups: { maxStudents: number }[] };

const NAV_ITEMS = [
  { href: "/projects", label: "Projekte",  icon: "folder" },
  { href: "/groups",   label: "Gruppen",   icon: "people" },
];

function NavIcon({ name }: { name: string }) {
  if (name === "folder") return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  );
  if (name === "people") return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
  if (name === "settings") return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
  return null;
}

export default function Sidebar({ username, isSuperuser }: { username: string; isSuperuser: boolean }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/projects").then(r => r.ok ? r.json() : []).then(setProjects);
  }, [pathname]);

  const sidebarBg = "#1c1b19"; // --color-surface dark
  const borderC  = "rgba(255,255,255,0.06)";
  const mutedC   = "rgba(255,255,255,0.38)";
  const activeC  = "rgba(255,255,255,0.95)";
  const activeBg = "rgba(255,255,255,0.09)";
  const sectionC = "rgba(255,255,255,0.25)";

  return (
    <aside style={{
      width: 248,
      flexShrink: 0,
      height: "100vh",
      overflowY: "auto",
      background: sidebarBg,
      backdropFilter: "blur(24px)",
      WebkitBackdropFilter: "blur(24px)",
      color: "white",
      padding: "var(--space-5) var(--space-3)",
      display: "flex",
      flexDirection: "column",
      gap: "2px",
      borderRight: `1px solid ${borderC}`,
    }}>

      {/* ── User Badge ── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        padding: "var(--space-3) var(--space-3)",
        background: "rgba(255,255,255,0.06)",
        borderRadius: "var(--radius-lg)",
        marginBottom: "var(--space-5)",
        border: `1px solid ${borderC}`,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: "var(--radius-full)",
          background: "var(--color-primary)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 700, fontSize: "0.85rem", flexShrink: 0,
          color: "var(--color-text-inverse)",
        }}>
          {username.charAt(0).toUpperCase()}
        </div>
        <div style={{ overflow: "hidden", flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: "var(--text-sm)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: activeC }}>
            {username}
          </div>
          <div style={{ fontSize: "var(--text-xs)", color: isSuperuser ? "var(--color-primary-highlight)" : mutedC, marginTop: 1, fontWeight: isSuperuser ? 600 : 400 }}>
            {isSuperuser ? "Super User" : "Lehrer"}
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: sectionC, textTransform: "uppercase", letterSpacing: "0.09em", padding: "0 var(--space-3)", marginBottom: "var(--space-1)" }}>
        Navigation
      </div>

      {NAV_ITEMS.map(({ href, label, icon }) => {
        const active = pathname?.startsWith(href);
        return (
          <Link key={href} href={href} style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: "var(--space-2) var(--space-3)",
            borderRadius: "var(--radius-md)",
            background: active ? activeBg : "transparent",
            color: active ? activeC : mutedC,
            textDecoration: "none",
            fontSize: "var(--text-sm)",
            fontWeight: active ? 600 : 400,
          }}>
            <NavIcon name={icon} />
            {label}
          </Link>
        );
      })}

      {isSuperuser && (
        <Link href="/settings" style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          padding: "var(--space-2) var(--space-3)",
          borderRadius: "var(--radius-md)",
          background: pathname?.startsWith("/settings") ? activeBg : "transparent",
          color: pathname?.startsWith("/settings") ? activeC : mutedC,
          textDecoration: "none",
          fontSize: "var(--text-sm)",
          fontWeight: pathname?.startsWith("/settings") ? 600 : 400,
        }}>
          <NavIcon name="settings" />
          Einstellungen
        </Link>
      )}

      {/* ── Divider ── */}
      <div style={{ height: 1, background: borderC, margin: "var(--space-3) var(--space-2)" }} />

      {/* ── Projects List ── */}
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

      {/* ── Sign Out ── */}
      <button
        className="danger"
        style={{
          marginTop: "var(--space-3)",
          width: "100%",
          borderRadius: "var(--radius-md)",
          background: "rgba(161,44,123,0.15)",
          color: "#d163a7",
          border: `1px solid rgba(161,44,123,0.2)`,
          boxShadow: "none",
          fontWeight: 600,
          fontSize: "var(--text-sm)",
        }}
        onClick={() => signOut({ callbackUrl: "/lehrer" })}
      >
        Abmelden
      </button>
    </aside>
  );
}
