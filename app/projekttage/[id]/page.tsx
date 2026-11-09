"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { formatDateOnly, formatDateTime } from "@/lib/dateHelpers";
import DescriptionRenderer from "@/components/DescriptionRenderer";
import { useMe } from "@/components/useMe";
import { excludedClassesLabel } from "@/lib/forms";
import { apiError, type Project, type ProjectDay } from "@/lib/apiTypes";

export default function ProjectDayDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const me = useMe();
  const isSuperuser = me?.role === "SUPERUSER";

  const [day, setDay] = useState<ProjectDay | null>(null);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState("");

  const loadProjects = useCallback(async () => {
    const res = await fetch(`/api/projects?projectDayId=${encodeURIComponent(id)}`);
    if (res.ok) setProjects(await res.json());
  }, [id]);

  useEffect(() => {
    fetch(`/api/project-days/${id}`).then(async (res) => {
      if (!res.ok) { setError(await apiError(res, "Projekttag konnte nicht geladen werden.")); return; }
      setDay(await res.json());
    });
    loadProjects();
  }, [id, loadProjects]);

  async function deleteDay() {
    if (!day) return;
    if (!confirm(`Projekttag „${day.name}“ inkl. aller Projekte, Prioritäten und Zuteilungen wirklich löschen?`)) return;
    const res = await fetch(`/api/project-days/${id}`, { method: "DELETE" });
    if (!res.ok) { setError(await apiError(res, "Fehler beim Löschen.")); return; }
    router.push("/projekttage");
    router.refresh();
  }

  async function deleteProject(p: Project) {
    if (!confirm(`Projekt „${p.name}“ wirklich löschen?`)) return;
    const res = await fetch(`/api/projects/${p.id}`, { method: "DELETE" });
    if (!res.ok) { setError(await apiError(res, "Fehler beim Löschen.")); return; }
    loadProjects();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="top-bar">
        <h1>{day?.name ?? "Projekttag"}</h1>
        <div className="top-bar-actions">
          <Link href="/projekttage"><button className="secondary btn-sm">&larr; Zurück</button></Link>
          {day && isSuperuser && (
            <>
              <Link href={`/projekttage/${id}/edit`}><button className="secondary btn-sm">Bearbeiten</button></Link>
              <button className="danger btn-sm" onClick={deleteDay}>Löschen</button>
            </>
          )}
        </div>
      </div>

      <div className="page-content">
        {error && <div className="error-banner">{error}</div>}

        {day && (
          <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: "var(--space-6)" }}>
            {day.bannerImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={day.bannerImage} alt="Banner" style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />
            )}
            <div style={{ padding: "var(--space-5)" }}>
              <div style={{ marginBottom: "var(--space-2)" }}>
                {day.schoolClasses.map((c) => <span key={c.id} className="class-badge">{c.name}</span>)}
              </div>
              <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", marginBottom: "var(--space-3)", lineHeight: 1.55 }}>
                <DescriptionRenderer text={day.description} />
              </div>
              <div style={{ display: "flex", gap: "var(--space-4)", fontSize: "var(--text-xs)", color: "var(--color-text-faint)", flexWrap: "wrap", alignItems: "center" }}>
                <span>📅 {formatDateOnly(day.startDate)} – {formatDateOnly(day.endDate)}</span>
                <span>⏰ Frist: {formatDateTime(day.enrollmentDeadline)}</span>
                <span>Code: <span className="code-badge">{day.code}</span></span>
              </div>
            </div>
          </div>
        )}

        {day && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)", gap: "var(--space-3)", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: "var(--text-lg)" }}>{isSuperuser ? "Alle Projekte" : "Meine Projekte"}</h2>
              <Link href={`/projekttage/${id}/projekte/new`}><button>+ Projekt anlegen</button></Link>
            </div>

            {projects?.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">👥</div>
                <p>Noch keine Projekte vorhanden.</p>
              </div>
            )}

            <div className="card-grid">
              {projects?.map((p) => (
                <div key={p.id} className="content-card">
                  {p.bannerImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.bannerImage} alt="Banner" style={{ width: "100%", height: 130, objectFit: "cover", display: "block" }} />
                  ) : (
                    <div style={{ height: 6, background: "linear-gradient(90deg, #007AFF, #34AADC)" }} />
                  )}
                  <div className="content-card-body">
                    <h4 style={{ margin: "0 0 var(--space-2)" }}>{p.name}</h4>
                    <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", flex: 1, marginBottom: "var(--space-3)" }}>
                      <DescriptionRenderer text={p.description} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", fontSize: "var(--text-xs)", color: "var(--color-text-faint)", marginBottom: "var(--space-3)" }}>
                      <span>Max. {p.maxStudents} Schüler</span>
                      <span>Lehrer: {p.owner?.username ?? "keiner zugeordnet"}</span>
                      {p.excludedClasses.length > 0 && <span>{excludedClassesLabel(p.excludedClasses)}</span>}
                    </div>
                    <div className="btn-group" style={{ justifyContent: "flex-end" }}>
                      <Link href={`/projekttage/${id}/projekte/${p.id}/edit`}>
                        <button className="secondary btn-sm">Bearbeiten</button>
                      </Link>
                      <button className="danger btn-sm" onClick={() => deleteProject(p)}>Löschen</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
