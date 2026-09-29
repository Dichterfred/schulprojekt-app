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

  // Loading state
  if (loading) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "100vh", background: "#F2F2F7",
      }}>
        <div style={{ textAlign: "center" }}>
          <div className="spinner" style={{ margin: "0 auto 1rem" }} />
          <p style={{ color: "#AEAEB2", fontSize: "0.88rem", fontWeight: 500 }}>Lädt…</p>
        </div>
      </div>
    );
  }

  // No project state
  if (!project) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "100vh", background: "#F2F2F7", padding: "1.5rem",
      }}>
        <div style={{
          background: "white", borderRadius: 22,
          padding: "2.75rem 2rem",
          maxWidth: 400, width: "100%",
          textAlign: "center",
          boxShadow: "0 12px 40px rgba(0,0,0,0.10)",
          border: "1px solid rgba(0,0,0,0.05)",
        }}>
          <div style={{ fontSize: "3.5rem", marginBottom: "1rem", lineHeight: 1 }}>📋</div>
          <h2 style={{ marginBottom: "0.6rem", letterSpacing: "-0.02em" }}>Kein Projekt zugewiesen</h2>
          <p style={{ color: "#6C6C70", marginBottom: "1.75rem", fontSize: "0.9rem", lineHeight: 1.6 }}>
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

  // SVG donut values
  const r = 18;
  const circ = 2 * Math.PI * r;
  const dash = progressPct * circ;

  return (
    <div style={{ minHeight: "100vh", background: "#F2F2F7" }}>

      {/* ── Project Hero Banner ── */}
      <div style={{ position: "relative" }}>
        {project.bannerImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.bannerImage}
            alt="Projektbanner"
            style={{ width: "100%", height: 230, objectFit: "cover", display: "block" }}
          />
        ) : (
          <div style={{
            height: 180,
            background: "linear-gradient(135deg, #0A84FF 0%, #30B5FF 60%, #5AC8FA 100%)",
          }} />
        )}
        {/* Scrim at bottom for readability */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 80,
          background: "linear-gradient(to top, rgba(242,242,247,0.9), transparent)",
          pointerEvents: "none",
        }} />
        <div style={{ position: "absolute", top: "1rem", right: "1rem", zIndex: 2 }}>
          <LogoutButton callbackUrl="/schueler" />
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 660, margin: "0 auto", padding: "0 1.25rem 6rem" }}>

        {/* Project Card — floats over banner */}
        <div style={{
          background: "white",
          borderRadius: 20,
          padding: "1.5rem 1.6rem",
          marginTop: "-2.5rem",
          boxShadow: "0 10px 36px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)",
          marginBottom: "0.85rem",
          position: "relative", zIndex: 1,
          border: "1px solid rgba(0,0,0,0.04)",
        }}>
          <h1 style={{ marginBottom: "0.4rem", fontSize: "1.45rem" }}>{project.name}</h1>
          <div style={{ color: "#6C6C70", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: "1rem" }}>
            <DescriptionRenderer text={project.description} />
          </div>

          {/* Deadline pill */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.55rem 0.9rem",
            background: deadlinePassed ? "rgba(255,59,48,0.07)" : "rgba(0,122,255,0.07)",
            borderRadius: 10,
            border: `1px solid ${deadlinePassed ? "rgba(255,59,48,0.15)" : "rgba(0,122,255,0.15)"}`,
          }}>
            <span style={{ fontSize: "1rem" }}>{deadlinePassed ? "⏰" : "📅"}</span>
            <div>
              <div style={{
                fontSize: "0.7rem", fontWeight: 700,
                color: deadlinePassed ? "#FF3B30" : "#007AFF",
                textTransform: "uppercase", letterSpacing: "0.05em",
              }}>
                {deadlinePassed ? "Frist abgelaufen" : "Einschreibefrist"}
              </div>
              <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#1C1C1E" }}>
                {formatDateTime(project.enrollmentDeadline)}
              </div>
            </div>
          </div>

          {deadlinePassed && (
            <p style={{ color: "#FF3B30", fontSize: "0.83rem", marginTop: "0.7rem", marginBottom: 0, fontWeight: 500 }}>
              Die Einschreibefrist ist abgelaufen. Es können keine Prioritäten mehr vergeben werden.
            </p>
          )}
        </div>

        {/* Progress Card */}
        {groupCount > 0 && (
          <div style={{
            background: "white",
            borderRadius: 16,
            padding: "1rem 1.3rem",
            marginBottom: "1rem",
            boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
            border: "1px solid rgba(0,0,0,0.04)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
          }}>
            <div>
              <div style={{ fontSize: "0.72rem", color: "#6C6C70", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.2rem" }}>
                Bewertungsfortschritt
              </div>
              <div style={{ fontSize: "1.15rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
                {assignedCount}
                <span style={{ fontSize: "0.88rem", fontWeight: 500, color: "#6C6C70" }}> / {groupCount} Gruppen bewertet</span>
              </div>
            </div>
            {/* SVG Donut */}
            <svg width="52" height="52" viewBox="0 0 52 52" style={{ flexShrink: 0 }}>
              <circle cx="26" cy="26" r={r} fill="none" stroke="#E5E5EA" strokeWidth="5" />
              <circle
                cx="26" cy="26" r={r}
                fill="none"
                stroke="#007AFF"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeDashoffset={circ / 4}
                style={{ transition: "stroke-dasharray 0.5s cubic-bezier(0.4,0,0.2,1)" }}
              />
              <text x="26" y="30" textAnchor="middle" fontSize="10" fontWeight="700" fill="#007AFF">
                {Math.round(progressPct * 100)}%
              </text>
            </svg>
          </div>
        )}

        {/* Section Header */}
        <div style={{
          fontSize: "0.72rem", fontWeight: 700,
          color: "#AEAEB2",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          margin: "1.35rem 0 0.65rem",
          paddingLeft: "0.1rem",
        }}>
          Gruppen bewerten — Priorität 1 = höchste
        </div>

        {error && <p className="error-text">{error}</p>}
        {groups.length === 0 && (
          <p style={{ color: "#AEAEB2", fontSize: "0.9rem", textAlign: "center", padding: "2rem 0" }}>
            Für dieses Projekt wurden noch keine Gruppen angelegt.
          </p>
        )}

        {/* Group Cards */}
        {groups.map((g, idx) => (
          <div key={g.id} style={{
            background: "white",
            borderRadius: 16,
            overflow: "hidden",
            marginBottom: "0.75rem",
            boxShadow: "0 2px 12px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)",
            border: g.priority !== null
              ? "1.5px solid rgba(0,122,255,0.22)"
              : "1.5px solid rgba(0,0,0,0.04)",
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}>
            {g.bannerImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={g.bannerImage} alt="Banner" style={{ width: "100%", height: 110, objectFit: "cover", display: "block" }} />
            )}
            {!g.bannerImage && (
              <div style={{ height: 4, background: g.priority !== null ? "linear-gradient(90deg,#007AFF,#5AC8FA)" : "#E5E5EA" }} />
            )}

            <div style={{ padding: "1rem 1.1rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                  {/* Index badge */}
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%",
                    background: "#F2F2F7",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.7rem", fontWeight: 700, color: "#6C6C70", flexShrink: 0,
                  }}>
                    {idx + 1}
                  </div>
                  <h4 style={{ margin: 0, fontSize: "0.95rem" }}>{g.name}</h4>
                  {g.priority !== null && (
                    <span style={{
                      fontSize: "0.7rem", fontWeight: 700,
                      background: "rgba(0,122,255,0.10)",
                      color: "#007AFF",
                      padding: "0.1rem 0.4rem",
                      borderRadius: 6,
                      letterSpacing: "0.02em",
                    }}>P{g.priority}</span>
                  )}
                </div>
                <div style={{ fontSize: "0.85rem", color: "#6C6C70", lineHeight: 1.55, marginBottom: "0.3rem" }}>
                  <DescriptionRenderer text={g.description} />
                </div>
                <p style={{ fontSize: "0.76rem", color: "#AEAEB2", margin: 0, fontWeight: 500 }}>Max. {g.maxStudents} Schüler</p>
              </div>

              <div style={{ textAlign: "right", minWidth: 140, flexShrink: 0 }}>
                <select
                  className="priority-select"
                  value={g.priority ?? ""}
                  disabled={deadlinePassed || savingId === g.id}
                  onChange={(e) => handlePriorityChange(g.id, e.target.value)}
                  style={{
                    borderColor: g.priority !== null ? "rgba(0,122,255,0.3)" : undefined,
                    background: g.priority !== null ? "rgba(0,122,255,0.05)" : undefined,
                    fontWeight: g.priority !== null ? 600 : undefined,
                  }}
                >
                  <option value="">- keine -</option>
                  {Array.from({ length: groupCount }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n} disabled={usedPriorities.includes(n) && g.priority !== n}>
                      Priorität {n}
                    </option>
                  ))}
                </select>
                {savingId === g.id && (
                  <div style={{ fontSize: "0.72rem", color: "#AEAEB2", marginTop: "0.35rem", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.3rem" }}>
                    <span style={{ width: 10, height: 10, border: "1.5px solid #E5E5EA", borderTopColor: "#AEAEB2", borderRadius: "50%", animation: "spin 0.65s linear infinite", display: "inline-block" }} />
                    Speichert…
                  </div>
                )}
                {savedId === g.id && (
                  <div className="saved-badge" style={{ marginTop: "0.35rem", display: "inline-block" }}>✓ Gespeichert</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
