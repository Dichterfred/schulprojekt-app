"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

type Project = { id: string; name: string; studentCount: number; groups: { maxStudents: number }[] };

const NAV_ITEMS = [
  { href: "/projects", label: "Projekte", icon: "📋" },
  { href: "/groups",   label: "Gruppen",  icon: "👥" },
];

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
      width: 260,
      background: "rgba(28,28,30,0.97)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      color: "white",
      padding: "1.75rem 1rem",
      display: "flex",
      flexDirection: "column",
      gap: "0.25rem",
      borderRight: "1px solid rgba(255,255,255,0.06)",
      position: "sticky",
      top: 0,
      height: "100vh",
      flexShrink: 0,
    }}>

      {/* User Badge */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.6rem 0.75rem",
        background: "rgba(255,255,255,0.06)",
        borderRadius: 12,
        marginBottom: "1.25rem",
      }}>
        <div style={{
          width: 36, height: 36,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #007AFF, #34AADC)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 700, fontSize: "0.95rem", flexShrink: 0,
        }}>
          {username.charAt(0).toUpperCase()}
        </div>
        <div style={{ overflow: "hidden" }}>
          <div style={{ fontWeight: 600, fontSize: "0.9rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{username}</div>
          <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.45)", marginTop: 1 }}>{isSuperuser ? "Super User" : "Lehrer"}</div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav style={{ marginBottom: "0.5rem" }}>
        <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 0.75rem", marginBottom: "0.4rem" }}>
          Navigation
        </div>
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link key={href} href={href} style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              padding: "0.55rem 0.75rem",
              borderRadius: 10,
              marginBottom: "0.15rem",
              background: active ? "rgba(0,122,255,0.25)" : "transparent",
              color: active ? "#60B8FF" : "rgba(255,255,255,0.8)",
              textDecoration: "none",
              fontSize: "0.9rem",
              fontWeight: active ? 600 : 400,
              transition: "background 0.15s, color 0.15s",
            }}>
              <span style={{ fontSize: "1rem", width: 20, textAlign: "center" }}>{icon}</span>
              {label}
            </Link>
          );
        })}
        {isSuperuser && (
          <Link href="/settings" style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            padding: "0.55rem 0.75rem",
            borderRadius: 10,
            marginBottom: "0.15rem",
            background: pathname?.startsWith("/settings") ? "rgba(0,122,255,0.25)" : "transparent",
            color: pathname?.startsWith("/settings") ? "#60B8FF" : "rgba(255,255,255,0.8)",
            textDecoration: "none",
            fontSize: "0.9rem",
            fontWeight: pathname?.startsWith("/settings") ? 600 : 400,
            transition: "background 0.15s, color 0.15s",
          }}>
            <span style={{ fontSize: "1rem", width: 20, textAlign: "center" }}>⚙️</span>
            Einstellungen
          </Link>
        )}
      </nav>

      {/* Divider */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "0.25rem 0.5rem" }} />

      {/* Projects List */}
      <div style={{ flex: 1, overflowY: "auto", marginTop: "0.25rem" }}>
        <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 0.75rem", marginBottom: "0.5rem" }}>
          {isSuperuser ? "Alle Projekte" : "Meine Projekte"}
        </div>
        {projects.length === 0 && (
          <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.3)", padding: "0 0.75rem" }}>Keine Projekte.</p>
        )}
        {projects.map((p) => {
          const used = p.groups.reduce((sum, g) => sum + g.maxStudents, 0);
          const pct  = p.studentCount > 0 ? Math.min(100, (used / p.studentCount) * 100) : 0;
          return (
            <Link key={p.id} href={`/groups?projectId=${p.id}`} style={{
              display: "block",
              padding: "0.55rem 0.75rem",
              marginBottom: "0.2rem",
              borderRadius: 10,
              background: "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.85)",
              textDecoration: "none",
              fontSize: "0.85rem",
              transition: "background 0.15s",
            }}>
              <div style={{ fontWeight: 500, marginBottom: "0.3rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
              {/* Mini progress bar */}
              <div style={{ height: 3, background: "rgba(255,255,255,0.1)", borderRadius: 99 }}>
                <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#007AFF,#34AADC)", borderRadius: 99, transition: "width 0.4s" }} />
              </div>
              <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.35)", marginTop: "0.2rem" }}>{used} / {p.studentCount} Schüler</div>
            </Link>
          );
        })}
      </div>

      {/* Logout */}
      <button
        className="danger"
        style={{ marginTop: "0.75rem", width: "100%", borderRadius: 10 }}
        onClick={() => signOut({ callbackUrl: "/lehrer" })}
      >
        Abmelden
      </button>
    </aside>
  );
}
