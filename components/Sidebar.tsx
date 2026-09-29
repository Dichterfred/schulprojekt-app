"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

type Project = { id: string; name: string; studentCount: number; groups: { maxStudents: number }[] };

const NAV_ITEMS = [
  { href: "/projects", label: "Projekte",      icon: "folder" },
  { href: "/groups",   label: "Gruppen",       icon: "people" },
];

function NavIcon({ name }: { name: string }) {
  if (name === "folder") return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  );
  if (name === "people") return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
  if (name === "settings") return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
  return null;
}

export default function Sidebar({ username, isSuperuser }: { username: string; isSuperuser: boolean }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const pathname = usePathname();

  async function loadProjects() {
    const res = await fetch("/api/projects");
    if (res.ok) setProjects(await res.json());
  }

  useEffect(() => { loadProjects(); }, [pathname]);

  return (
    <aside style={{
      width: 256,
      flexShrink: 0,
      height: "100vh",
      overflowY: "auto",
      background: "rgba(26,26,28,0.98)",
      backdropFilter: "blur(24px)",
      WebkitBackdropFilter: "blur(24px)",
      color: "white",
      padding: "1.5rem 0.85rem 1.5rem",
      display: "flex",
      flexDirection: "column",
      gap: "0.15rem",
      borderRight: "1px solid rgba(255,255,255,0.05)",
    }}>

      {/* ── User Badge ── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "0.7rem",
        padding: "0.65rem 0.8rem",
        background: "rgba(255,255,255,0.07)",
        borderRadius: 13,
        marginBottom: "1.35rem",
        border: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: "50%",
          background: "linear-gradient(135deg, #0A84FF, #5AC8FA)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 700, fontSize: "0.9rem", flexShrink: 0,
          boxShadow: "0 2px 8px rgba(0,122,255,0.35)",
        }}>
          {username.charAt(0).toUpperCase()}
        </div>
        <div style={{ overflow: "hidden", flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: "0.88rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{username}</div>
          <div style={{
            fontSize: "0.7rem",
            color: isSuperuser ? "rgba(10,132,255,0.8)" : "rgba(255,255,255,0.38)",
            marginTop: 1, fontWeight: isSuperuser ? 600 : 400,
          }}>
            {isSuperuser ? "Super User" : "Lehrer"}
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.09em", padding: "0 0.8rem", marginBottom: "0.35rem" }}>
        Navigation
      </div>

      {NAV_ITEMS.map(({ href, label, icon }) => {
        const active = pathname?.startsWith(href);
        return (
          <Link key={href} href={href} style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            padding: "0.52rem 0.8rem",
            borderRadius: 10,
            marginBottom: "0.1rem",
            background: active ? "rgba(0,122,255,0.22)" : "transparent",
            color: active ? "#60B8FF" : "rgba(255,255,255,0.72)",
            textDecoration: "none",
            fontSize: "0.88rem",
            fontWeight: active ? 600 : 400,
            transition: "background 0.15s, color 0.15s",
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
          gap: "0.6rem",
          padding: "0.52rem 0.8rem",
          borderRadius: 10,
          marginBottom: "0.1rem",
          background: pathname?.startsWith("/settings") ? "rgba(0,122,255,0.22)" : "transparent",
          color: pathname?.startsWith("/settings") ? "#60B8FF" : "rgba(255,255,255,0.72)",
          textDecoration: "none",
          fontSize: "0.88rem",
          fontWeight: pathname?.startsWith("/settings") ? 600 : 400,
          transition: "background 0.15s, color 0.15s",
        }}>
          <NavIcon name="settings" />
          Einstellungen
        </Link>
      )}

      {/* ── Divider ── */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "0.5rem 0.5rem" }} />

      {/* ── Projects List ── */}
      <div style={{ flex: 1, overflowY: "auto", marginTop: "0.1rem" }}>
        <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.09em", padding: "0 0.8rem", marginBottom: "0.45rem" }}>
          {isSuperuser ? "Alle Projekte" : "Meine Projekte"}
        </div>
        {projects.length === 0 && (
          <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.25)", padding: "0 0.8rem" }}>Keine Projekte.</p>
        )}
        {projects.map((p) => {
          const used = p.groups.reduce((sum, g) => sum + g.maxStudents, 0);
          const pct  = p.studentCount > 0 ? Math.min(100, (used / p.studentCount) * 100) : 0;
          return (
            <Link key={p.id} href={`/groups?projectId=${p.id}`} style={{
              display: "block",
              padding: "0.5rem 0.8rem",
              marginBottom: "0.18rem",
              borderRadius: 10,
              background: "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.82)",
              textDecoration: "none",
              fontSize: "0.82rem",
              transition: "background 0.15s",
              border: "1px solid transparent",
            }}>
              <div style={{ fontWeight: 500, marginBottom: "0.3rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
              <div style={{ height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 99 }}>
                <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#0A84FF,#5AC8FA)", borderRadius: 99, transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)" }} />
              </div>
              <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.32)", marginTop: "0.22rem" }}>{used} / {p.studentCount} Schüler</div>
            </Link>
          );
        })}
      </div>

      {/* ── Sign Out ── */}
      <button
        style={{
          marginTop: "0.75rem",
          width: "100%",
          borderRadius: 10,
          background: "rgba(255,59,48,0.15)",
          color: "#FF6B6B",
          border: "1px solid rgba(255,59,48,0.2)",
          boxShadow: "none",
          fontWeight: 600,
          fontSize: "0.88rem",
        }}
        onClick={() => signOut({ callbackUrl: "/lehrer" })}
      >
        Abmelden
      </button>
    </aside>
  );
}
