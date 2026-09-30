"use client";

import { useEffect, useState } from "react";
import LogoutButton from "@/components/LogoutButton";
import { formatDateTime } from "@/lib/dateHelpers";
import DescriptionRenderer from "@/components/DescriptionRenderer";

type Group = {
  id: string; name: string; description: string;
  bannerImage: string | null; maxStudents: number; priority: number | null;
};
type ProjectInfo = {
  id: string; name: string; description: string;
  bannerImage: string | null; enrollmentDeadline: string;
};

export default function StudentPage() {
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [deadlinePassed, setDeadlinePassed] = useState(false);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/student/groups");
    if (res.ok) {
      const data = await res.json();
      setProject(data.project); setGroups(data.groups); setDeadlinePassed(data.deadlinePassed);
    } else {
      setError("Es konnte kein zugewiesenes Projekt gefunden werden.");
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function handlePriorityChange(groupId: string, value: string) {
    setError(""); setSavedId(null);
    if (value === "") {
      setSavingId(groupId);
      await fetch(`/api/student/priorities?groupId=${groupId}`, { method: "DELETE" });
      await load(); setSavingId(null); return;
    }
    const priority = Number(value);
    setSavingId(groupId);
    const res = await fetch("/api/student/priorities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId, priority }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Fehler beim Speichern der Priorität.");
      setSavingId(null); return;
    }
    await load(); setSavingId(null);
    setSavedId(groupId); setTimeout(() => setSavedId(null), 2000);
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

  if (!project) {
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
          <h2 style={{ marginBottom: "var(--space-2)" }}>Kein Projekt zugewiesen</h2>
          <p style={{ color: "var(--color-text-muted)", marginBottom: "var(--space-6)", fontSize: "var(--text-sm)" }}>
            {error || "Dir wurde noch kein Projekt zugewiesen. Bitte wende dich an deine Lehrkraft."}
          </p>
          <LogoutButton callbackUrl="/schueler" />
        </div>
      </div>
    );
  }

  const groupCount = groups.length;
  const usedPriorities = groups.filter((g) => g.priority !== null).map((g) => g.priority);
  const assignedCount = groups.filter((g) => g.priority !== null).length;
  const progressPct = groupCount > 0 ? assignedCount / groupCount : 0;
  const r = 18; const circ = 2 * Math.PI * r;
  const dash = progressPct * circ;

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>

      {/* ── Project Banner ── */}
      <div style={{ position: "relative" }}>
        {project.bannerImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.bannerImage} alt="Projektbanner" style={{ width: "100%", height: 200, objectFit: "cover", display: "block" }} />
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
          marginTop: "-var(--space-8)",
          marginTop: "-2rem",
          boxShadow: "var(--shadow-lg)",
          marginBottom: "var(--space-4)",
          position: "relative", zIndex: 1,
          border: "1px solid oklch(from var(--color-text) l c h / 0.07)",
        }}>
          <h1 style={{ marginBottom: "var(--space-2)", fontSize: "var(--text-xl)" }}>{project.name}</h1>
          <div style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)", lineHeight: 1.6, marginBottom: "var(--space-4)" }}>
            <DescriptionRenderer text={project.description} />
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
                {formatDateTime(project.enrollmentDeadline)}
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
        {groupCount > 0 && (
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
                <span style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--color-text-muted)" }}> / {groupCount} Gruppen bewertet</span>
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
          Gruppen bewerten — Priorität 1 = höchste
        </div>

        {error && <p className="error-text">{error}</p>}

        {groups.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <p>Für dieses Projekt wurden noch keine Gruppen angelegt.</p>
          </div>
        )}

        {/* Group Cards */}
        {groups.map((g, idx) => (
          <div key={g.id} style={{
            background: "var(--color-surface)",
            borderRadius: "var(--radius-xl)",
            overflow: "hidden",
            marginBottom: "var(--space-3)",
            boxShadow: "var(--shadow-sm)",
            border: g.priority !== null
              ? `1.5px solid oklch(from var(--color-primary) l c h / 0.3)`
              : `1px solid oklch(from var(--color-text) l c h / 0.07)`,
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}>
            {g.bannerImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={g.bannerImage} alt="Banner" style={{ width: "100%", height: 100, objectFit: "cover", display: "block" }} />
            ) : (
              <div style={{
                height: 4,
                background: g.priority !== null ? "var(--color-primary)" : "var(--color-surface-dynamic)",
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
                  <h4 style={{ margin: 0, fontSize: "var(--text-base)" }}>{g.name}</h4>
                  {g.priority !== null && (
                    <span style={{
                      fontSize: "var(--text-xs)", fontWeight: 700,
                      background: "var(--color-primary-highlight)",
                      color: "var(--color-primary)",
                      padding: "0.1rem var(--space-2)",
                      borderRadius: "var(--radius-sm)",
                    }}>P{g.priority}</span>
                  )}
                </div>
                <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", lineHeight: 1.55, marginBottom: "var(--space-2)" }}>
                  <DescriptionRenderer text={g.description} />
                </div>
                <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-faint)", margin: 0 }}>Max. {g.maxStudents} Schüler</p>
              </div>

              <div style={{ textAlign: "right", minWidth: 140, flexShrink: 0 }}>
                <select
                  className="priority-select"
                  value={g.priority ?? ""}
                  disabled={deadlinePassed || savingId === g.id}
                  onChange={(e) => handlePriorityChange(g.id, e.target.value)}
                  style={{
                    borderColor: g.priority !== null ? "oklch(from var(--color-primary) l c h / 0.3)" : undefined,
                    background: g.priority !== null ? "var(--color-primary-highlight)" : undefined,
                    fontWeight: g.priority !== null ? 600 : undefined,
                    color: g.priority !== null ? "var(--color-primary)" : undefined,
                  }}
                >
                  <option value="">- keine -</option>
                  {Array.from({ length: groupCount }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n} disabled={usedPriorities.includes(n) && g.priority !== n}>
                      Priorität {n}
                    </option>
                  ))}
                </select>
                {savingId === g.id && (
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-faint)", marginTop: "var(--space-2)", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "var(--space-1)" }}>
                    <span style={{ width: 10, height: 10, border: "1.5px solid var(--color-surface-dynamic)", borderTopColor: "var(--color-text-faint)", borderRadius: "50%", animation: "spin 0.65s linear infinite", display: "inline-block" }} />
                    Speichert…
                  </div>
                )}
                {savedId === g.id && (
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
