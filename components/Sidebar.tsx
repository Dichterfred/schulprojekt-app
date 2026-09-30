"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

type Project = { id: string; name: string; studentCount: number; groups: { maxStudents: number }[] };

export default function Sidebar({ username, isSuperuser }: { username: string; isSuperuser: boolean }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const pathname = usePathname();

  async function loadProjects() {
    const res = await fetch("/api/projects");
    if (res.ok) setProjects(await res.json());
  }

  useEffect(() => {
    loadProjects();
  }, [pathname]);

  return (
    <aside style={{ width: 260, background: "#111827", color: "white", padding: "1.5rem 1.2rem", display: "flex", flexDirection: "column" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <strong>{username}</strong>
        <div style={{ fontSize: "0.8rem", color: "#9ca3af" }}>{isSuperuser ? "Super User" : "Lehrer"}</div>
      </div>

      <nav style={{ marginBottom: "1.5rem" }}>
        <Link href="/projects" style={{ display: "block", color: pathname?.startsWith("/projects") ? "#60a5fa" : "white", marginBottom: "0.6rem", textDecoration: "none" }}>Projekte</Link>
        <Link href="/groups" style={{ display: "block", color: pathname?.startsWith("/groups") ? "#60a5fa" : "white", marginBottom: "0.6rem", textDecoration: "none" }}>Gruppen</Link>
        {isSuperuser && (
          <Link href="/settings" style={{ display: "block", color: pathname?.startsWith("/settings") ? "#60a5fa" : "white", marginBottom: "0.6rem", textDecoration: "none" }}>Einstellungen</Link>
        )}
      </nav>

      <div style={{ flex: 1, overflowY: "auto" }}>
        <h4 style={{ color: "#9ca3af", fontSize: "0.75rem", textTransform: "uppercase" }}>{isSuperuser ? "Alle Projekte" : "Meine Projekte"}</h4>
        {projects.length === 0 && <p style={{ fontSize: "0.85rem", color: "#9ca3af" }}>Noch keine Projekte vorhanden.</p>}
        {projects.map((p) => {
          const used = p.groups.reduce((sum, g) => sum + g.maxStudents, 0);
          return (
            <Link key={p.id} href={`/groups?projectId=${p.id}`} style={{ display: "block", padding: "0.5rem 0.6rem", marginBottom: "0.4rem", borderRadius: 6, background: "#1f2937", color: "white", textDecoration: "none", fontSize: "0.9rem" }}>
              <div>{p.name}</div>
              <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{used} / {p.studentCount} Schüler</div>
            </Link>
          );
        })}
      </div>

      <button className="danger" style={{ marginTop: "1rem" }} onClick={() => signOut({ callbackUrl: "/lehrer" })}>Abmelden</button>
    </aside>
  );
}
