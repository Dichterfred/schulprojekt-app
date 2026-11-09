"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { apiError } from "@/lib/apiTypes";
import LogoutButton from "@/components/LogoutButton";
import { formatDateTime } from "@/lib/dateHelpers";
import DescriptionRenderer from "@/components/DescriptionRenderer";

type Project = {
  id: string; name: string; description: string;
  bannerImage: string | null; maxStudents: number; priority: number | null;
};
type ProjectDayInfo = {
  id: string; name: string; description: string;
  bannerImage: string | null; enrollmentDeadline: string;
};
type StudentProjectsResponse = { projectDay: ProjectDayInfo; deadlinePassed: boolean; projects: Project[] };

/** Session ungültig (z. B. neues Passwort, Klassenwechsel) → abmelden und zum Schüler-Login. */
function isSessionExpired(res: Response): boolean {
  if (res.status !== 401) return false;
  signOut({ callbackUrl: "/schueler" });
  return true;
}

export default function StudentPage() {
  const [loading, setLoading] = useState(true);
  const [projectDay, setProjectDay] = useState<ProjectDayInfo | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [deadlinePassed, setDeadlinePassed] = useState(false);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  function apply(data: StudentProjectsResponse) {
    setProjectDay(data.projectDay); setProjects(data.projects); setDeadlinePassed(data.deadlinePassed);
  }

  /** Lädt Projekttag und Projekte neu; `false`, wenn die Session abgelaufen ist oder ein Fehler auftrat. */
  async function reload(): Promise<boolean> {
    const res = await fetch("/api/student/projects");
    if (isSessionExpired(res)) return false;
    if (!res.ok) { setError(await apiError(res, "Die Projekte konnten nicht geladen werden.")); return false; }
    apply(await res.json());
    return true;
  }

  // `cancelled` verhindert, dass eine veraltete Antwort (doppelter Effekt im Dev-Modus) den Zustand setzt.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/student/projects").then(async (res) => {
      if (cancelled || isSessionExpired(res)) return;
      if (res.ok) apply(await res.json());
      else setError(await apiError(res, "Der Projekttag konnte nicht geladen werden."));
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  async function handlePriorityChange(projectId: string, value: string) {
    setError(""); setSavedId(null);
    setSavingId(projectId);
    const res = value === ""
      ? await fetch(`/api/student/priorities?projectId=${encodeURIComponent(projectId)}`, { method: "DELETE" })
      : await fetch("/api/student/priorities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, priority: Number(value) }),
      });
    if (isSessionExpired(res)) return;
    if (!res.ok) {
      setError(await apiError(res, "Fehler beim Speichern der Priorität."));
      // Stand neu laden (z. B. Projekt inzwischen ausgeschlossen oder Frist abgelaufen)
      await reload();
      setSavingId(null); return;
    }
    const ok = await reload();
    setSavingId(null);
    if (ok && value !== "") { setSavedId(projectId); setTimeout(() => setSavedId(null), 2000); }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--color-bg)" }}>
        <div style={{ textAlign: "center" }}>
          <div className="spinner" style={{ margin: "0 auto var(--space-4)" }} />
          <p style={{ color: "var(--color-text-faint)", fontSize: "var(--text-sm)" }}>Lädt…</p>
        </div>
      </div>
    );
  }

  if (!projectDay) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--color-bg)", padding: "var(--space-6)" }}>
        <div style={{
          background: "var(--color-surface)",
          borderRadius: "var(--radius-2xl)",
          padding: "var(--space-12) var(--space-8)",
          maxWidth: 400, width: "100%",
          textAlign: "center",
          boxShadow: "var(--shadow-lg)",
          border: "1px solid oklch(from var(--color-text) l c h / 0.07)",
        }}>
          <div className="empty-state-icon" style={{ margin: "0 auto var(--space-4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <h2 style={{ marginBottom: "var(--space-2)" }}>Projekttag nicht verfügbar</h2>
          <p style={{ color: "var(--color-text-muted)", marginBottom: "var(--space-6)", fontSize: "var(--text-sm)" }}>
            {error || "Der Projekttag konnte nicht geladen werden. Bitte wende dich an deine Lehrkraft."}
          </p>
          <LogoutButton callbackUrl="/schueler" />
        </div>
      </div>
    );
  }

  const projectCount = projects.length;
  const usedPriorities = projects.filter((x) => x.priority !== null).map((x) => x.priority);
  const assignedCount = projects.filter((x) => x.priority !== null).length;
  const progressPct = projectCount > 0 ? assignedCount / projectCount : 0;
  const r = 18; const circ = 2 * Math.PI * r;
  const dash = progressPct * circ;

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>

      {/* ── Banner des Projekttags ── */}
      <div style={{ position: "relative" }}>
        {projectDay.bannerImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={projectDay.bannerImage} alt="Banner des Projekttags" style={{ width: "100%", height: 200, objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ height: 160, background: "var(--color-primary)" }} />
        )}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 80,
          background: "linear-gradient(to top, var(--color-bg), transparent)",
          pointerEvents: "none",
        }} />
        <div style={{ position: "absolute", top: "var(--space-4)", right: "var(--space-4)", zIndex: 2 }}>
          <LogoutButton callbackUrl="/schueler" />
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 var(--space-5) var(--space-16)" }}>

        {/* Project Card — overlaps banner */}
        <div style={{
          background: "var(--color-surface)",
          borderRadius: "var(--radius-xl)",
          padding: "var(--space-6)",
          marginTop: "calc(-1 * var(--space-8))",
          boxShadow: "var(--shadow-lg)",
          marginBottom: "var(--space-4)",
          position: "relative", zIndex: 1,
          border: "1px solid oklch(from var(--color-text) l c h / 0.07)",
        }}>

        <h1 style={{ marginBottom: "var(--space-2)", fontSize: "var(--text-xl)" }}>{projectDay.name}</h1>
          <div style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)", lineHeight: 1.6, marginBottom: "var(--space-4)" }}>
            <DescriptionRenderer text={projectDay.description} />
          </div>

          {/* Deadline pill */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-3)",
            padding: "var(--space-2) var(--space-4)",
            background: deadlinePassed ? "var(--color-error-highlight)" : "var(--color-primary-highlight)",
            borderRadius: "var(--radius-lg)",
            border: `1px solid oklch(from ${deadlinePassed ? "var(--color-error)" : "var(--color-primary)"} l c h / 0.2)`,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={deadlinePassed ? "var(--color-error)" : "var(--color-primary)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <div>
              <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: deadlinePassed ? "var(--color-error)" : "var(--color-primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {deadlinePassed ? "Frist abgelaufen" : "Einschreibefrist"}
              </div>
              <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-text)" }}>
                {formatDateTime(projectDay.enrollmentDeadline)}
              </div>
            </div>
          </div>

          {deadlinePassed && (
            <p style={{ color: "var(--color-error)", fontSize: "var(--text-xs)", marginTop: "var(--space-3)", marginBottom: 0, fontWeight: 500 }}>
              Die Einschreibefrist ist abgelaufen. Es können keine Prioritäten mehr vergeben werden.
            </p>
          )}
        </div>

        {/* Progress Card */}
        {projectCount > 0 && (
          <div style={{
            background: "var(--color-surface)",
            borderRadius: "var(--radius-xl)",
            padding: "var(--space-4) var(--space-5)",
            marginBottom: "var(--space-4)",
            boxShadow: "var(--shadow-sm)",
            border: "1px solid oklch(from var(--color-text) l c h / 0.07)",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-4)",
          }}>
            <div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "var(--space-1)" }}>
                Bewertungsfortschritt
              </div>
              <div style={{ fontSize: "var(--text-lg)", fontWeight: 700, letterSpacing: "-0.02em" }}>
                {assignedCount}
                <span style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--color-text-muted)" }}> / {projectCount} Projekte bewertet</span>
              </div>
            </div>
            <svg width="52" height="52" viewBox="0 0 52 52" style={{ flexShrink: 0 }}>
              <circle cx="26" cy="26" r={r} fill="none" stroke="var(--color-surface-dynamic)" strokeWidth="5" />
              <circle cx="26" cy="26" r={r} fill="none" stroke="var(--color-primary)" strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeDashoffset={circ / 4}
                style={{ transition: "stroke-dasharray 0.5s cubic-bezier(0.4,0,0.2,1)" }}
              />
              <text x="26" y="30" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--color-primary)">
                {Math.round(progressPct * 100)}%
              </text>
            </svg>
          </div>
        )}

        {/* Section Header */}
        <div className="section-label" style={{ paddingLeft: "var(--space-1)" }}>
          Projekte bewerten — Priorität 1 = höchste
        </div>

        {error && <p className="error-text">{error}</p>}

        {projects.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <p>Für diesen Projekttag gibt es noch keine Projekte.</p>
          </div>
        )}

        {/* Projekt-Karten */}
        {projects.map((p, idx) => (
          <div key={p.id} style={{
            background: "var(--color-surface)",
            borderRadius: "var(--radius-xl)",
            overflow: "hidden",
            marginBottom: "var(--space-3)",
            boxShadow: "var(--shadow-sm)",
            border: p.priority !== null
              ? `1.5px solid oklch(from var(--color-primary) l c h / 0.3)`
              : `1px solid oklch(from var(--color-text) l c h / 0.07)`,
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}>
            {p.bannerImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.bannerImage} alt="Banner" style={{ width: "100%", height: 100, objectFit: "cover", display: "block" }} />
            ) : (
              <div style={{
                height: 4,
                background: p.priority !== null ? "var(--color-primary)" : "var(--color-surface-dynamic)",
              }} />
            )}

            <div style={{ padding: "var(--space-4) var(--space-5)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-4)" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: "var(--radius-full)",
                    background: "var(--color-surface-offset)",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.68rem", fontWeight: 700, color: "var(--color-text-muted)", flexShrink: 0,
                  }}>{idx + 1}</span>
                  <h4 style={{ margin: 0, fontSize: "var(--text-base)" }}>{p.name}</h4>
                  {p.priority !== null && (
                    <span style={{
                      fontSize: "var(--text-xs)", fontWeight: 700,
                      background: "var(--color-primary-highlight)",
                      color: "var(--color-primary)",
                      padding: "0.1rem var(--space-2)",
                      borderRadius: "var(--radius-sm)",
                    }}>P{p.priority}</span>
                  )}
                </div>
                <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", lineHeight: 1.55, marginBottom: "var(--space-2)" }}>
                  <DescriptionRenderer text={p.description} />
                </div>
                <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-faint)", margin: 0 }}>Max. {p.maxStudents} Schüler</p>
              </div>

              <div style={{ textAlign: "right", minWidth: 140, flexShrink: 0 }}>
                <select
                  className="priority-select"
                  value={p.priority ?? ""}
                  disabled={deadlinePassed || savingId === p.id}
                  onChange={(e) => handlePriorityChange(p.id, e.target.value)}
                  style={{
                    borderColor: p.priority !== null ? "oklch(from var(--color-primary) l c h / 0.3)" : undefined,
                    background: p.priority !== null ? "var(--color-primary-highlight)" : undefined,
                    fontWeight: p.priority !== null ? 600 : undefined,
                    color: p.priority !== null ? "var(--color-primary)" : undefined,
                  }}
                >
                  <option value="">- keine -</option>
                  {Array.from({ length: projectCount }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n} disabled={usedPriorities.includes(n) && p.priority !== n}>
                      Priorität {n}
                    </option>
                  ))}
                </select>
                {savingId === p.id && (
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-faint)", marginTop: "var(--space-2)", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "var(--space-1)" }}>
                    <span style={{ width: 10, height: 10, border: "1.5px solid var(--color-surface-dynamic)", borderTopColor: "var(--color-text-faint)", borderRadius: "50%", animation: "spin 0.65s linear infinite", display: "inline-block" }} />
                    Speichert…
                  </div>
                )}
                {savedId === p.id && (
                  <span className="saved-badge" style={{ marginTop: "var(--space-2)", display: "inline-block" }}>✓ Gespeichert</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
