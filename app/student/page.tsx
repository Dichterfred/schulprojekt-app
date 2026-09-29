"use client";

import { useEffect, useState } from "react";
import LogoutButton from "@/components/LogoutButton";
import { formatDateTime } from "@/lib/dateHelpers";
import DescriptionRenderer from "@/components/DescriptionRenderer";

type Group = {
  id: string;
  name: string;
  description: string;
  bannerImage: string | null;
  maxStudents: number;
  priority: number | null;
};

type ProjectInfo = {
  id: string;
  name: string;
  description: string;
  bannerImage: string | null;
  enrollmentDeadline: string;
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
      setProject(data.project);
      setGroups(data.groups);
      setDeadlinePassed(data.deadlinePassed);
    } else {
      setError("Es konnte kein zugewiesenes Projekt gefunden werden.");
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handlePriorityChange(groupId: string, value: string) {
    setError("");
    setSavedId(null);
    if (value === "") {
      setSavingId(groupId);
      await fetch(`/api/student/priorities?groupId=${groupId}`, { method: "DELETE" });
      await load();
      setSavingId(null);
      return;
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
      setSavingId(null);
      return;
    }
    await load();
    setSavingId(null);
    setSavedId(groupId);
    setTimeout(() => setSavedId(null), 2000);
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#F2F2F7" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 40, height: 40,
            border: "3px solid #E5E5EA",
            borderTopColor: "#007AFF",
            borderRadius: "50%",
            animation: "spin 0.7s linear infinite",
            margin: "0 auto 1rem",
          }} />
          <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
          <p style={{ color: "#6C6C70", fontSize: "0.9rem" }}>Lädt…</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#F2F2F7", padding: "1.5rem" }}>
        <div style={{
          background: "white",
          borderRadius: 20,
          padding: "2.5rem",
          maxWidth: 420,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📋</div>
          <h2 style={{ marginBottom: "0.5rem" }}>Kein Projekt zugewiesen</h2>
          <p style={{ color: "#6C6C70", marginBottom: "1.5rem" }}>{error || "Dir wurde noch kein Projekt zugewiesen. Bitte wende dich an deine Lehrkraft."}</p>
          <LogoutButton callbackUrl="/schueler" />
        </div>
      </div>
    );
  }

  const groupCount = groups.length;
  const usedPriorities = groups.filter((g) => g.priority !== null).map((g) => g.priority);
  const assignedCount = groups.filter((g) => g.priority !== null).length;

  return (
    <div style={{ minHeight: "100vh", background: "#F2F2F7" }}>

      {/* Projekt-Header */}
      <div style={{ position: "relative" }}>
        {project.bannerImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.bannerImage} alt="Banner" style={{ width: "100%", height: 220, objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ height: 160, background: "linear-gradient(135deg, #007AFF 0%, #34AADC 100%)" }} />
        )}

        {/* Frosted logout button */}
        <div style={{ position: "absolute", top: "1rem", right: "1rem" }}>
          <LogoutButton callbackUrl="/schueler" />
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 1.25rem 6rem" }}>

        {/* Project Card */}
        <div style={{
          background: "white",
          borderRadius: 20,
          padding: "1.5rem",
          marginTop: "-2rem",
          boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
          marginBottom: "1rem",
          position: "relative",
          zIndex: 1,
        }}>
          <h1 style={{ marginBottom: "0.35rem" }}>{project.name}</h1>
          <DescriptionRenderer text={project.description} />

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginTop: "0.75rem",
            padding: "0.6rem 0.85rem",
            background: deadlinePassed ? "rgba(255,59,48,0.07)" : "rgba(0,122,255,0.07)",
            borderRadius: 10,
            border: `1px solid ${deadlinePassed ? "rgba(255,59,48,0.15)" : "rgba(0,122,255,0.15)"}`,
          }}>
            <span style={{ fontSize: "1.1rem" }}>{deadlinePassed ? "⏰" : "📅"}</span>
            <div>
              <div style={{ fontSize: "0.78rem", fontWeight: 600, color: deadlinePassed ? "#FF3B30" : "#007AFF", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {deadlinePassed ? "Frist abgelaufen" : "Einschreibefrist"}
              </div>
              <div style={{ fontSize: "0.9rem", fontWeight: 500, color: "#1C1C1E" }}>
                {formatDateTime(project.enrollmentDeadline)}
              </div>
            </div>
          </div>

          {deadlinePassed && (
            <p style={{ color: "#FF3B30", fontSize: "0.83rem", marginTop: "0.75rem", marginBottom: 0 }}>
              Die Einschreibefrist ist abgelaufen. Es können keine Prioritäten mehr vergeben werden.
            </p>
          )}
        </div>

        {/* Progress Summary */}
        {groupCount > 0 && (
          <div style={{
            background: "white",
            borderRadius: 14,
            padding: "1rem 1.25rem",
            marginBottom: "1rem",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <div>
              <div style={{ fontSize: "0.78rem", color: "#6C6C70", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Bewertungsfortschritt</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: "0.1rem" }}>{assignedCount} / {groupCount} Gruppen bewertet</div>
            </div>
            <div style={{
              width: 48, height: 48,
              borderRadius: "50%",
              background: `conic-gradient(#007AFF ${(assignedCount/groupCount)*360}deg, #E5E5EA 0deg)`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, color: "#007AFF" }}>
                {Math.round((assignedCount/groupCount)*100)}%
              </div>
            </div>
          </div>
        )}

        <h3 style={{ margin: "1.25rem 0 0.75rem", color: "#6C6C70", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Gruppen bewerten &mdash; Priorität 1 = höchste Priorität
        </h3>
        {error && <p className="error-text">{error}</p>}
        {groups.length === 0 && <p style={{ color: "#6C6C70" }}>Für dieses Projekt wurden noch keine Gruppen angelegt.</p>}

        {groups.map((g, idx) => (
          <div key={g.id} style={{
            background: "white",
            borderRadius: 16,
            overflow: "hidden",
            marginBottom: "0.75rem",
            boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
            border: g.priority !== null ? "1.5px solid rgba(0,122,255,0.2)" : "1.5px solid transparent",
            transition: "border-color 0.2s",
          }}>
            {g.bannerImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={g.bannerImage} alt="Banner" style={{ width: "100%", height: 110, objectFit: "cover", display: "block" }} />
            )}

            <div style={{ padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                  <div style={{
                    width: 24, height: 24,
                    borderRadius: "50%",
                    background: "#F2F2F7",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.72rem", fontWeight: 700, color: "#6C6C70", flexShrink: 0,
                  }}>
                    {idx + 1}
                  </div>
                  <h4 style={{ margin: 0 }}>{g.name}</h4>
                  {g.priority !== null && (
                    <span style={{
                      fontSize: "0.72rem", fontWeight: 700,
                      background: "rgba(0,122,255,0.1)",
                      color: "#007AFF",
                      padding: "0.1rem 0.45rem",
                      borderRadius: 6,
                    }}>P{g.priority}</span>
                  )}
                </div>
                <DescriptionRenderer text={g.description} />
                <p style={{ fontSize: "0.78rem", color: "#AEAEB2", margin: 0 }}>Max. {g.maxStudents} Schüler</p>
              </div>

              <div style={{ textAlign: "right", minWidth: 130, flexShrink: 0 }}>
                <select
                  className="priority-select"
                  value={g.priority ?? ""}
                  disabled={deadlinePassed || savingId === g.id}
                  onChange={(e) => handlePriorityChange(g.id, e.target.value)}
                  style={{
                    borderColor: g.priority !== null ? "rgba(0,122,255,0.3)" : undefined,
                    background: g.priority !== null ? "rgba(0,122,255,0.05)" : undefined,
                  }}
                >
                  <option value="">- keine -</option>
                  {Array.from({ length: groupCount }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n} disabled={usedPriorities.includes(n) && g.priority !== n}>
                      Priorität {n}
                    </option>
                  ))}
                </select>
                {savingId === g.id && <div style={{ fontSize: "0.72rem", color: "#AEAEB2", marginTop: "0.35rem" }}>Speichert…</div>}
                {savedId === g.id && <div className="saved-badge" style={{ marginTop: "0.35rem", display: "inline-block" }}>Gespeichert ✓</div>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
