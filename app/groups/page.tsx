"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import BannerUpload from "@/components/BannerUpload";
import DescriptionRenderer from "@/components/DescriptionRenderer";

type Project = { id: string; name: string; studentCount: number };
type StudentPriority = {
  priority: number;
  student: { id: string; firstName: string; lastName: string };
};
type Group = {
  id: string;
  name: string;
  description: string;
  maxStudents: number;
  bannerImage: string | null;
  priorities: StudentPriority[];
};

function GroupsContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || "");
  const [groups, setGroups] = useState<Group[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editBanner, setEditBanner] = useState<string | null>(null);
  const [editMaxStudents, setEditMaxStudents] = useState("");
  const [editError, setEditError] = useState("");

  async function loadProjects() {
    const res = await fetch("/api/projects");
    if (res.ok) {
      const data = await res.json();
      setProjects(data);
      if (!selectedProjectId && data.length > 0) setSelectedProjectId(data[0].id);
    }
  }

  async function loadGroups(pid: string) {
    if (!pid) return;
    const res = await fetch(`/api/groups?projectId=${pid}`);
    if (res.ok) {
      const data = await res.json();
      setGroups(data);
      // preserve expand-all state
      if (allExpanded) setExpandedIds(new Set(data.map((g: Group) => g.id)));
    }
  }

  useEffect(() => { loadProjects(); }, []);
  useEffect(() => { if (selectedProjectId) loadGroups(selectedProjectId); }, [selectedProjectId]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const used = groups.reduce((sum, g) => sum + g.maxStudents, 0);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); setAllExpanded(false); }
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allExpanded) {
      setExpandedIds(new Set());
      setAllExpanded(false);
    } else {
      setExpandedIds(new Set(groups.map((g) => g.id)));
      setAllExpanded(true);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Diese Gruppe wirklich löschen?")) return;
    await fetch(`/api/groups/${id}`, { method: "DELETE" });
    loadGroups(selectedProjectId);
  }

  function startEdit(g: Group) {
    setEditingId(g.id); setEditName(g.name); setEditDescription(g.description);
    setEditBanner(g.bannerImage); setEditMaxStudents(String(g.maxStudents)); setEditError("");
  }

  function cancelEdit() { setEditingId(null); setEditError(""); }

  async function saveEdit(id: string) {
    setEditError("");
    const res = await fetch(`/api/groups/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, description: editDescription, bannerImage: editBanner, maxStudents: Number(editMaxStudents) }),
    });
    if (!res.ok) { const data = await res.json(); setEditError(data.error || "Fehler beim Speichern."); return; }
    setEditingId(null);
    loadGroups(selectedProjectId);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* ===== Top Bar ===== */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.85rem 2rem",
        background: "rgba(255,255,255,0.8)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(0,0,0,0.07)",
        flexShrink: 0,
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <h1 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, letterSpacing: "-0.02em", marginRight: "0.5rem" }}>Gruppen</h1>

        <div style={{ width: 1, height: 22, background: "#E5E5EA", flexShrink: 0 }} />

        {/* Filter: Projekt */}
        <span style={{ fontSize: "0.82rem", color: "#6C6C70", fontWeight: 500, whiteSpace: "nowrap" }}>Projekt:</span>
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          style={{ width: "auto", marginBottom: 0, fontSize: "0.85rem", padding: "0.4rem 2rem 0.4rem 0.65rem", maxWidth: 220 }}
        >
          <option value="">-- wählen --</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        {/* Zugeteilt-Info */}
        {selectedProject && (
          <span style={{
            fontSize: "0.78rem",
            color: "#AEAEB2",
            background: "#F2F2F7",
            borderRadius: 6,
            padding: "0.25rem 0.6rem",
            whiteSpace: "nowrap",
          }}>
            {used} / {selectedProject.studentCount} Schüler
          </span>
        )}

        <div style={{ width: 1, height: 22, background: "#E5E5EA", flexShrink: 0 }} />

        {/* Alle ausklappen */}
        {groups.length > 0 && (
          <button
            className="secondary"
            onClick={toggleAll}
            style={{ padding: "0.4rem 0.85rem", fontSize: "0.82rem", borderRadius: 8, display: "flex", alignItems: "center", gap: "0.35rem" }}
          >
            <svg
              width="12" height="12" viewBox="0 0 12 12" fill="none"
              style={{ transition: "transform 0.2s", transform: allExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              <path d="M2 4l4 4 4-4" stroke="#1C1C1E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {allExpanded ? "Alle einklappen" : "Alle ausklappen"}
          </button>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Action */}
        <Link href={`/groups/new${selectedProjectId ? `?projectId=${selectedProjectId}` : ""}`}>
          <button style={{ padding: "0.45rem 1rem", fontSize: "0.875rem", borderRadius: 8 }}>
            + Gruppe erstellen
          </button>
        </Link>
      </div>

      {/* ===== Scrollable Content ===== */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1.75rem 2rem 2rem" }}>
        {selectedProject && groups.length === 0 && (
          <div style={{ textAlign: "center", padding: "4rem 2rem", color: "#AEAEB2" }}>
            <p style={{ fontSize: "1rem", marginBottom: "1rem" }}>Noch keine Gruppen vorhanden.</p>
            <Link href={`/groups/new?projectId=${selectedProjectId}`}><button>Erste Gruppe erstellen</button></Link>
          </div>
        )}

        <div className="card-grid">
          {groups.map((g) => {
            const isEditing = editingId === g.id;
            const isExpanded = expandedIds.has(g.id);
            const enrolled = g.priorities ?? [];
            const spotsLeft = g.maxStudents - enrolled.length;

            return (
              <div key={g.id} style={{
                background: "white",
                borderRadius: 16,
                overflow: "hidden",
                boxShadow: "0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
                border: "1px solid rgba(0,0,0,0.04)",
                position: "relative",
                display: "flex",
                flexDirection: "column",
              }}>
                {/* Edit button */}
                {!isExpanded && (
                  <button
                    className="edit-icon-btn"
                    style={{ top: "0.6rem", right: "0.6rem", zIndex: 3, background: isEditing ? "#F2F2F7" : "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)" }}
                    onClick={() => (isEditing ? cancelEdit() : startEdit(g))}
                  >
                    {isEditing ? "\u2715" : "\u270e"}
                  </button>
                )}

                {/* Banner */}
                {!isEditing && g.bannerImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.bannerImage} alt="Banner" style={{ width: "100%", height: 130, objectFit: "cover", display: "block" }} />
                )}
                {!isEditing && !g.bannerImage && (
                  <div style={{ height: 6, background: "linear-gradient(90deg, #007AFF, #34AADC)" }} />
                )}

                <div style={{ padding: "1.1rem 1.25rem", flex: 1, display: "flex", flexDirection: "column" }}>
                  {isEditing ? (
                    <>
                      <BannerUpload folder="groups" currentUrl={editBanner} onUploaded={(url) => setEditBanner(url)} onRemove={() => setEditBanner(null)} />
                      <label>Gruppenname</label>
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} required style={{ marginBottom: "0.75rem" }} />
                      <label>Beschreibung (Links: [Text](https://...))</label>
                      <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} required style={{ marginBottom: "0.75rem" }} />
                      <label>Max. Schüler</label>
                      <input type="number" min={1} value={editMaxStudents} onChange={(e) => setEditMaxStudents(e.target.value)} required style={{ marginBottom: "0.75rem" }} />
                      {editError && <p className="error-text">{editError}</p>}
                      <div style={{ display: "flex", gap: "0.5rem", marginTop: "auto" }}>
                        <button onClick={() => saveEdit(g.id)}>Speichern</button>
                        <button className="secondary" onClick={cancelEdit}>Abbrechen</button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Header row: name + expand toggle */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.4rem" }}>
                        <h4 style={{ margin: 0, fontSize: "1rem", paddingRight: "2rem" }}>{g.name}</h4>
                        <button
                          onClick={() => toggleExpand(g.id)}
                          style={{
                            background: "none",
                            border: "none",
                            boxShadow: "none",
                            padding: "0.2rem",
                            cursor: "pointer",
                            color: "#6C6C70",
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 6,
                            transition: "background 0.15s",
                          }}
                          title={isExpanded ? "Einklappen" : "Schüler anzeigen"}
                        >
                          <svg
                            width="16" height="16" viewBox="0 0 16 16" fill="none"
                            style={{ transition: "transform 0.22s", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                          >
                            <path d="M3 6l5 5 5-5" stroke="#6C6C70" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>

                      <div style={{ fontSize: "0.85rem", color: "#6C6C70", flex: 1, marginBottom: "0.75rem" }}>
                        <DescriptionRenderer text={g.description} />
                      </div>

                      {/* Footer */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ fontSize: "0.82rem", color: enrolled.length >= g.maxStudents ? "#FF3B30" : "#AEAEB2" }}>
                            {enrolled.length} / {g.maxStudents} Schüler
                          </span>
                          {spotsLeft > 0 && (
                            <span style={{ fontSize: "0.72rem", color: "#34C759", background: "#F0FFF4", border: "1px solid rgba(52,199,89,0.2)", borderRadius: 5, padding: "0.1rem 0.4rem" }}>
                              {spotsLeft} frei
                            </span>
                          )}
                          {spotsLeft === 0 && enrolled.length > 0 && (
                            <span style={{ fontSize: "0.72rem", color: "#FF3B30", background: "rgba(255,59,48,0.07)", border: "1px solid rgba(255,59,48,0.15)", borderRadius: 5, padding: "0.1rem 0.4rem" }}>
                              voll
                            </span>
                          )}
                        </div>
                        <button className="danger" style={{ fontSize: "0.82rem", padding: "0.35rem 0.75rem" }} onClick={() => handleDelete(g.id)}>Löschen</button>
                      </div>

                      {/* ===== Expandable Student List ===== */}
                      {isExpanded && (
                        <div style={{
                          marginTop: "0.85rem",
                          borderTop: "1px solid #F2F2F7",
                          paddingTop: "0.85rem",
                        }}>
                          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#AEAEB2", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>
                            Eingeschriebene Schüler
                          </div>
                          {enrolled.length === 0 ? (
                            <p style={{ fontSize: "0.83rem", color: "#AEAEB2", margin: 0 }}>Noch keine Schüler eingeschrieben.</p>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                              {enrolled.map((ep) => (
                                <div key={ep.student.id} style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.6rem",
                                  padding: "0.45rem 0.65rem",
                                  background: "#F9FAFB",
                                  borderRadius: 8,
                                  border: "1px solid #F2F2F7",
                                }}>
                                  {/* Avatar */}
                                  <div style={{
                                    width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                                    background: "linear-gradient(135deg, #007AFF, #34AADC)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    color: "white", fontWeight: 700, fontSize: "0.72rem",
                                  }}>
                                    {ep.student.firstName.charAt(0).toUpperCase()}
                                  </div>
                                  {/* Name */}
                                  <span style={{ flex: 1, fontSize: "0.85rem", fontWeight: 500 }}>
                                    {ep.student.firstName} {ep.student.lastName}
                                  </span>
                                  {/* Priority badge */}
                                  <span style={{
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    color: ep.priority === 1 ? "#007AFF" : "#AEAEB2",
                                    background: ep.priority === 1 ? "#EBF4FF" : "#F2F2F7",
                                    borderRadius: 5,
                                    padding: "0.1rem 0.45rem",
                                    letterSpacing: "0.02em",
                                  }}>
                                    P{ep.priority}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
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

export default function GroupsPage() {
  return (
    <Suspense fallback={<p style={{ padding: "2rem", color: "#AEAEB2" }}>Lädt…</p>}>
      <GroupsContent />
    </Suspense>
  );
}
