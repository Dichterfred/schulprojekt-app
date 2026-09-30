"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { toDateOnly, toLocalDateTimeInputValue, formatDateOnly, formatDateTime } from "@/lib/dateHelpers";
import BannerUpload from "@/components/BannerUpload";
import DescriptionRenderer from "@/components/DescriptionRenderer";

type SchoolClass = { id: string; name: string; sortOrder: number };

type Project = {
  id: string; name: string; description: string; bannerImage: string | null;
  studentCount: number; code: string; startDate: string; endDate: string;
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
  const [editBanner, setEditBanner] = useState<string | null>(null);
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
  useEffect(() => { loadProjects(); loadSchoolClasses(); }, []);

  function toggleEditClass(id: string) {
    setEditClassIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }
  async function handleDelete(id: string) {
    if (!confirm("Dieses Projekt inkl. aller Gruppen wirklich löschen?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    loadProjects();
  }
  function startEdit(p: Project) {
    setEditingId(p.id); setEditName(p.name); setEditDescription(p.description);
    setEditBanner(p.bannerImage); setEditStudentCount(String(p.studentCount));
    setEditClassIds(p.schoolClasses.map((c) => c.id));
    setEditStartDate(toDateOnly(p.startDate)); setEditEndDate(toDateOnly(p.endDate));
    setEditEnrollmentDeadline(toLocalDateTimeInputValue(p.enrollmentDeadline));
    setEditError("");
  }
  function cancelEdit() { setEditingId(null); setEditError(""); }
  async function saveEdit(id: string) {
    setEditError("");
    if (editClassIds.length === 0) { setEditError("Bitte mindestens eine Schulklasse auswählen."); return; }
    const res = await fetch(`/api/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName, description: editDescription, bannerImage: editBanner,
        studentCount: Number(editStudentCount), schoolClassIds: editClassIds,
        startDate: `${editStartDate}T00:00:00.000Z`,
        endDate: `${editEndDate}T23:59:59.999Z`,
        enrollmentDeadline: new Date(editEnrollmentDeadline).toISOString(),
      }),
    });
    if (!res.ok) { const data = await res.json(); setEditError(data.error || "Fehler beim Speichern."); return; }
    setEditingId(null); loadProjects();
  }

  const sortedProjects = useMemo(() => {
    const copy = [...projects];
    if (sortBy === "name") copy.sort((a, b) => a.name.localeCompare(b.name, "de"));
    else copy.sort((a, b) => {
      const aO = Math.min(...(a.schoolClasses.length ? a.schoolClasses.map(c => c.sortOrder) : [9999]));
      const bO = Math.min(...(b.schoolClasses.length ? b.schoolClasses.map(c => c.sortOrder) : [9999]));
      return aO - bO;
    });
    return copy;
  }, [projects, sortBy]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* ─── Top Bar ─── */}
      <div className="top-bar">
        <h1>Projekte</h1>
        <span className="top-bar-divider" />
        <div className="top-bar-sort">
          <span className="sort-label" style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", fontWeight: 500, whiteSpace: "nowrap" }}>Sortieren:</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "name" | "class")} style={{ width: "auto", marginBottom: 0 }}>
            <option value="name">Projektname</option>
            <option value="class">Schulklasse</option>
          </select>
        </div>
        <div className="top-bar-actions">
          <Link href="/projects/new"><button>+ Neu</button></Link>
        </div>
      </div>

      {/* ─── Content ─── */}
      <div className="page-content">

        {sortedProjects.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">📁</div>
            <p>Noch keine Projekte vorhanden.</p>
            <Link href="/projects/new"><button>Erstes Projekt erstellen</button></Link>
          </div>
        )}

        <div className="card-grid">
          {sortedProjects.map((p) => {
            const used = p.groups.reduce((sum, g) => sum + g.maxStudents, 0);
            const pct  = p.studentCount > 0 ? Math.min(100, (used / p.studentCount) * 100) : 0;
            const isEditing = editingId === p.id;
            return (
              <div key={p.id} className="content-card">
                <button
                  className="edit-icon-btn"
                  style={{ background: isEditing ? "var(--color-surface-offset)" : "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)" }}
                  onClick={() => (isEditing ? cancelEdit() : startEdit(p))}
                >
                  {isEditing ? "✕" : "✎"}
                </button>

                {!isEditing && p.bannerImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.bannerImage} alt="Banner" style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }} />
                )}
                {!isEditing && !p.bannerImage && (
                  <div style={{ height: 5, background: "linear-gradient(90deg,#007AFF,#5AC8FA)" }} />
                )}

                <div className="content-card-body">
                  {isEditing ? (
                    <>
                      <BannerUpload folder="projects" currentUrl={editBanner} onUploaded={(url) => setEditBanner(url)} onRemove={() => setEditBanner(null)} />
                      <label>Name</label>
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} required style={{ marginBottom: "var(--space-3)" }} />
                      <label>Beschreibung</label>
                      <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} required style={{ marginBottom: "var(--space-3)" }} />
                      <label>Schüler Anzahl</label>
                      <input type="number" min={1} value={editStudentCount} onChange={(e) => setEditStudentCount(e.target.value)} required style={{ marginBottom: "var(--space-3)" }} />
                      <label>Schulklassen</label>
                      <div className="checkbox-grid" style={{ marginBottom: "var(--space-3)" }}>
                        {schoolClasses.map((c) => (
                          <label key={c.id}><input type="checkbox" checked={editClassIds.includes(c.id)} onChange={() => toggleEditClass(c.id)} />{c.name}</label>
                        ))}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
                        <div><label>Start</label><input type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} required /></div>
                        <div><label>Ende</label><input type="date" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} required /></div>
                      </div>
                      <label style={{ marginTop: "var(--space-3)" }}>Einschreibefrist</label>
                      <input type="datetime-local" value={editEnrollmentDeadline} onChange={(e) => setEditEnrollmentDeadline(e.target.value)} required style={{ marginBottom: "var(--space-3)" }} />
                      {editError && <p className="error-text">{editError}</p>}
                      <div className="btn-group" style={{ marginTop: "auto", paddingTop: "var(--space-2)" }}>
                        <button onClick={() => saveEdit(p.id)}>Speichern</button>
                        <button className="secondary" onClick={cancelEdit}>Abbrechen</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h4 style={{ margin: "0 0 var(--space-1)", paddingRight: "2rem" }}>{p.name}</h4>
                      <div style={{ marginBottom: "var(--space-2)" }}>
                        {p.schoolClasses.map((c) => <span key={c.id} className="class-badge">{c.name}</span>)}
                      </div>
                      <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", marginBottom: "var(--space-2)", flex: 1, lineHeight: 1.55 }}>
                        <DescriptionRenderer text={p.description} />
                      </div>
                      <div style={{ display: "flex", gap: "var(--space-3)", fontSize: "var(--text-xs)", color: "var(--color-text-faint)", marginBottom: "var(--space-1)", flexWrap: "wrap" }}>
                        <span>📅 {formatDateOnly(p.startDate)} – {formatDateOnly(p.endDate)}</span>
                        <span>⏰ {formatDateTime(p.enrollmentDeadline)}</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "var(--space-2)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                          <span>{used}<span style={{ color: "var(--color-text-faint)" }}>/{p.studentCount} Sch.</span></span>
                          <span className="code-badge">{p.code}</span>
                        </div>
                        <div className="btn-group">
                          <Link href={`/groups?projectId=${p.id}`}>
                            <button className="secondary btn-sm">Gruppen</button>
                          </Link>
                          <button className="danger btn-sm" onClick={() => handleDelete(p.id)}>Löschen</button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
