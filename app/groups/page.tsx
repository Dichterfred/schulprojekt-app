"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import BannerUpload from "@/components/BannerUpload";
import DescriptionRenderer from "@/components/DescriptionRenderer";

type Project = { id: string; name: string; studentCount: number };
type Group = { id: string; name: string; description: string; maxStudents: number; bannerImage: string | null };

function GroupsContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || "");
  const [groups, setGroups] = useState<Group[]>([]);

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
    if (res.ok) setGroups(await res.json());
  }

  useEffect(() => { loadProjects(); }, []);
  useEffect(() => { if (selectedProjectId) loadGroups(selectedProjectId); }, [selectedProjectId]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const used = groups.reduce((sum, g) => sum + g.maxStudents, 0);

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

      {/* ===== Top Bar — shared .top-bar classes (mobile-aware) ===== */}
      <div className="top-bar">
        <h1>Gruppen</h1>
        <span className="top-bar-divider" />

        {/* Projekt-Filter */}
        <div className="top-bar-sort">
          <span className="sort-label" style={{ fontSize: "0.82rem", color: "#6C6C70", fontWeight: 500, whiteSpace: "nowrap" }}>Projekt:</span>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            style={{ width: "auto", marginBottom: 0, maxWidth: 180 }}
          >
            <option value="">-- wählen --</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {/* Zugeteilt-Info — auf Mobile ausblenden */}
        {selectedProject && (
          <span className="top-bar-stat">
            {used} / {selectedProject.studentCount} Schüler
          </span>
        )}

        {/* Action */}
        <div className="top-bar-actions">
          <Link href={`/groups/new${selectedProjectId ? `?projectId=${selectedProjectId}` : ""`}>
            <button style={{ borderRadius: 8 }}>+ Neu</button>
          </Link>
        </div>
      </div>

      {/* ===== Scrollable Content ===== */}
      <div className="page-content" style={{ flex: 1, overflowY: "auto", padding: "1.5rem 1.75rem 2rem" }}>
        {selectedProject && groups.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <p>Noch keine Gruppen vorhanden.</p>
            <Link href={`/groups/new?projectId=${selectedProjectId}`}><button>Erste Gruppe erstellen</button></Link>
          </div>
        )}

        <div className="card-grid">
          {groups.map((g) => {
            const isEditing = editingId === g.id;
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
                <button
                  className="edit-icon-btn"
                  style={{ top: "0.6rem", right: "0.6rem", zIndex: 3, background: isEditing ? "#F2F2F7" : "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)" }}
                  onClick={() => (isEditing ? cancelEdit() : startEdit(g))}
                >
                  {isEditing ? "✕" : "✎"}
                </button>

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
                      <h4 style={{ margin: "0 0 0.4rem", fontSize: "1rem" }}>{g.name}</h4>
                      <div style={{ fontSize: "0.85rem", color: "#6C6C70", flex: 1, marginBottom: "0.75rem" }}>
                        <DescriptionRenderer text={g.description} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.82rem", color: "#AEAEB2" }}>Max. {g.maxStudents} Schüler</span>
                        <button className="danger" style={{ fontSize: "0.82rem", padding: "0.35rem 0.75rem" }} onClick={() => handleDelete(g.id)}>Löschen</button>
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

export default function GroupsPage() {
  return (
    <Suspense fallback={<p style={{ padding: "2rem", color: "#AEAEB2" }}>Lädt…</p>}>
      <GroupsContent />
    </Suspense>
  );
}
