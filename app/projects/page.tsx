"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { toDateOnly, toLocalDateTimeInputValue, formatDateOnly, formatDateTime } from "@/lib/dateHelpers";

type SchoolClass = { id: string; name: string; sortOrder: number };

type Project = {
  id: string;
  name: string;
  description: string;
  studentCount: number;
  code: string;
  startDate: string;
  endDate: string;
  enrollmentDeadline: string;
  groups: { id: string; maxStudents: number }[];
  schoolClasses: SchoolClass[];
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [schoolClasses, setSchoolClasses] = useState<SchoolClass[]>([]);
  const [sortBy, setSortBy] = useState<"name" | "class">("name");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStudentCount, setEditStudentCount] = useState("");
  const [editClassIds, setEditClassIds] = useState<string[]>([]);
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editEnrollmentDeadline, setEditEnrollmentDeadline] = useState("");
  const [editError, setEditError] = useState("");

  async function loadProjects() {
    const res = await fetch("/api/projects");
    if (res.ok) setProjects(await res.json());
  }
  async function loadSchoolClasses() {
    const res = await fetch("/api/school-classes");
    if (res.ok) setSchoolClasses(await res.json());
  }

  useEffect(() => {
    loadProjects();
    loadSchoolClasses();
  }, []);

  function toggleEditClass(id: string) {
    setEditClassIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleDelete(id: string) {
    if (!confirm("Dieses Projekt inkl. aller Gruppen wirklich löschen?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    loadProjects();
  }

  function startEdit(p: Project) {
    setEditingId(p.id);
    setEditName(p.name);
    setEditDescription(p.description);
    setEditStudentCount(String(p.studentCount));
    setEditClassIds(p.schoolClasses.map((c) => c.id));
    setEditStartDate(toDateOnly(p.startDate));
    setEditEndDate(toDateOnly(p.endDate));
    setEditEnrollmentDeadline(toLocalDateTimeInputValue(p.enrollmentDeadline));
    setEditError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError("");
  }

  async function saveEdit(id: string) {
    setEditError("");

    if (editClassIds.length === 0) {
      setEditError("Bitte mindestens eine Schulklasse auswählen.");
      return;
    }

    const res = await fetch(`/api/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName,
        description: editDescription,
        studentCount: Number(editStudentCount),
        schoolClassIds: editClassIds,
        startDate: `${editStartDate}T00:00:00.000Z`,
        endDate: `${editEndDate}T23:59:59.999Z`,
        enrollmentDeadline: new Date(editEnrollmentDeadline).toISOString(),
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setEditError(data.error || "Fehler beim Speichern.");
      return;
    }

    setEditingId(null);
    loadProjects();
  }

  const sortedProjects = useMemo(() => {
    const copy = [...projects];
    if (sortBy === "name") {
      copy.sort((a, b) => a.name.localeCompare(b.name, "de"));
    } else {
      copy.sort((a, b) => {
        const aOrder = Math.min(...(a.schoolClasses.length ? a.schoolClasses.map((c) => c.sortOrder) : [9999]));
        const bOrder = Math.min(...(b.schoolClasses.length ? b.schoolClasses.map((c) => c.sortOrder) : [9999]));
        return aOrder - bOrder;
      });
    }
    return copy;
  }, [projects, sortBy]);

  return (
    <div>
      <div className="page-header">
        <h1 style={{ margin: 0 }}>Projekte</h1>
        <Link href="/projects/new"><button>+ Neues Projekt erstellen</button></Link>
      </div>

      <div className="sort-bar">
        <span style={{ fontSize: "0.9rem" }}>Sortieren nach:</span>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "name" | "class")}>
          <option value="name">Projektname</option>
          <option value="class">Schulklasse</option>
        </select>
      </div>

      {sortedProjects.length === 0 && <p>Noch keine Projekte vorhanden.</p>}
      {sortedProjects.map((p) => {
        const used = p.groups.reduce((sum, g) => sum + g.maxStudents, 0);
        const isEditing = editingId === p.id;
        return (
          <div key={p.id} className="card" style={{ maxWidth: 480 }}>
            <button className="edit-icon-btn" onClick={() => (isEditing ? cancelEdit() : startEdit(p))}>
              {isEditing ? "✕" : "✎"}
            </button>

            {isEditing ? (
              <div style={{ paddingRight: "2rem" }}>
                <label>Name</label>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} required />
                <label>Beschreibung</label>
                <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} required />
                <label>Schüler Anzahl</label>
                <input type="number" min={1} value={editStudentCount} onChange={(e) => setEditStudentCount(e.target.value)} required />

                <label>Schulklassen</label>
                <div className="checkbox-grid">
                  {schoolClasses.map((c) => (
                    <label key={c.id}>
                      <input type="checkbox" checked={editClassIds.includes(c.id)} onChange={() => toggleEditClass(c.id)} />
                      {c.name}
                    </label>
                  ))}
                </div>

                <label>Start (Datum, ohne Uhrzeit)</label>
                <input type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} required />
                <label>Ende (Datum, ohne Uhrzeit)</label>
                <input type="date" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} required />
                <label>Einschreibefrist (Datum &amp; Uhrzeit)</label>
                <input type="datetime-local" value={editEnrollmentDeadline} onChange={(e) => setEditEnrollmentDeadline(e.target.value)} required />

                {editError && <p className="error-text">{editError}</p>}
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button onClick={() => saveEdit(p.id)}>Speichern</button>
                  <button className="secondary" onClick={cancelEdit}>Abbrechen</button>
                </div>
              </div>
            ) : (
              <div style={{ paddingRight: "2rem" }}>
                <h4 style={{ margin: 0 }}>{p.name}</h4>
                <p style={{ color: "#555" }}>{p.description}</p>
                <div style={{ marginBottom: "0.4rem" }}>
                  {p.schoolClasses.map((c) => <span key={c.id} className="class-badge">{c.name}</span>)}
                </div>
                <p style={{ fontSize: "0.85rem" }}>
                  Anmeldecode für Schüler: <span className="code-badge">{p.code}</span>
                </p>
                <p style={{ fontSize: "0.8rem", color: "#555" }}>
                  Zeitraum: {formatDateOnly(p.startDate)} &ndash; {formatDateOnly(p.endDate)}
                </p>
                <p style={{ fontSize: "0.8rem", color: "#555" }}>
                  Einschreibefrist: {formatDateTime(p.enrollmentDeadline)}
                </p>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${Math.min(100, (used / p.studentCount) * 100)}%` }} />
                </div>
                <p style={{ fontSize: "0.85rem", color: "#555" }}>{used} / {p.studentCount} Schüler in Gruppen zugeteilt</p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Link href={`/groups?projectId=${p.id}`}>Gruppen verwalten &rarr;</Link>
                  <button className="danger" onClick={() => handleDelete(p.id)}>Löschen</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
