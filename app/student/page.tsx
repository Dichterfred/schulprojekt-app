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

  useEffect(() => {
    load();
  }, []);

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
    return <p style={{ padding: "2rem" }}>Lädt...</p>;
  }

  if (!project) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div className="card" style={{ maxWidth: 500, textAlign: "center" }}>
          <h1>Kein Projekt zugewiesen</h1>
          <p>{error || "Dir wurde noch kein Projekt zugewiesen. Bitte wende dich an deine Lehrkraft."}</p>
          <LogoutButton callbackUrl="/schueler" />
        </div>
      </div>
    );
  }

  const groupCount = groups.length;
  const usedPriorities = groups.filter((g) => g.priority !== null).map((g) => g.priority);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 0 6rem" }}>

      {/* Projekt-Banner */}
      {project.bannerImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={project.bannerImage}
          alt="Projektbanner"
          style={{ width: "100%", maxHeight: 200, objectFit: "cover", display: "block" }}
        />
      )}

      <div style={{ padding: "1.5rem 1.5rem 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1, marginRight: "1rem" }}>
            <h1 style={{ marginBottom: "0.2rem" }}>{project.name}</h1>
            <DescriptionRenderer text={project.description} />
          </div>
          <LogoutButton callbackUrl="/schueler" />
        </div>

        <div className="card">
          <p style={{ margin: 0 }}>
            Einschreibefrist: <strong>{formatDateTime(project.enrollmentDeadline)}</strong>
          </p>
          {deadlinePassed && (
            <p className="error-text" style={{ marginTop: "0.5rem" }}>
              Die Einschreibefrist ist bereits abgelaufen. Es können keine Prioritäten mehr
              vergeben oder geändert werden.
            </p>
          )}
        </div>

        <h3>Gruppen bewerten (Priorität 1 = höchste Priorität)</h3>
        {error && <p className="error-text">{error}</p>}

        {groups.length === 0 && <p>Für dieses Projekt wurden noch keine Gruppen angelegt.</p>}

        {groups.map((g) => (
          <div key={g.id} className="card" style={{ padding: 0, overflow: "hidden" }}>

            {/* Gruppen-Banner */}
            {g.bannerImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={g.bannerImage}
                alt="Gruppenbanner"
                style={{ width: "100%", height: 110, objectFit: "cover", display: "block" }}
              />
            )}

            <div style={{ padding: "0.9rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: 0 }}>{g.name}</h4>
                <DescriptionRenderer text={g.description} />
                <p style={{ fontSize: "0.8rem", color: "#555", margin: 0 }}>Max. {g.maxStudents} Schüler</p>
              </div>
              <div style={{ textAlign: "right", minWidth: 130 }}>
                <select
                  className="priority-select"
                  value={g.priority ?? ""}
                  disabled={deadlinePassed || savingId === g.id}
                  onChange={(e) => handlePriorityChange(g.id, e.target.value)}
                >
                  <option value="">- keine -</option>
                  {Array.from({ length: groupCount }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n} disabled={usedPriorities.includes(n) && g.priority !== n}>
                      Priorität {n}
                    </option>
                  ))}
                </select>
                {savingId === g.id && <div style={{ fontSize: "0.75rem", color: "#555", marginTop: "0.3rem" }}>Speichert...</div>}
                {savedId === g.id && <div className="saved-badge" style={{ marginTop: "0.3rem", display: "inline-block" }}>Gespeichert ✓</div>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
