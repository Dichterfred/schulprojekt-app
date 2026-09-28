"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
    setEditingId(g.id);
    setEditName(g.name);
    setEditDescription(g.description);
    setEditBanner(g.bannerImage);
    setEditMaxStudents(String(g.maxStudents));
    setEditError("");
  }

  function cancelEdit() { setEditingId(null); setEditError(""); }

  async function saveEdit(id: string) {
    setEditError("");
    const res = await fetch(`/api/groups/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, description: editDescription, bannerImage: editBanner, maxStudents: Number(editMaxStudents) }),
    });
    if (!res.ok) {
      const data = await res.json();
      setEditError(data.error || "Fehler beim Speichern.");
      return;
    }
    setEditingId(null);
    loadGroups(selectedProjectId);
  }

  return (
    <div>
      <div className="page-header">
        <h1 style={{ margin: 0 }}>Gruppen</h1>
        <Link href={`/groups/new${selectedProjectId ? `?projectId=${selectedProjectId}` : ""}`}>
          <button>+ Neue Gruppe erstellen</button>
        </Link>
      </div>

      <div className="card" style={{ maxWidth: 480 }}>
        <label>Projekt auswählen</label>
        <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}>
          <option value="">-- Projekt wählen --</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {selectedProject && (
        <>
          <p style={{ fontSize: "0.85rem", color: "#555" }}>
            {used} / {selectedProject.studentCount} Schüler bereits in Gruppen zugeteilt
          </p>

          {groups.length === 0 && <p>Noch keine Gruppen vorhanden.</p>}
          {groups.map((g) => {
            const isEditing = editingId === g.id;
            return (
              <div key={g.id} className="card" style={{ maxWidth: 480, padding: 0, overflow: "hidden" }}>
                <button
                  className="edit-icon-btn"
                  style={{ top: "0.5rem", right: "0.5rem", zIndex: 2 }}
                  onClick={() => (isEditing ? cancelEdit() : startEdit(g))}
                >
                  {isEditing ? "✕" : "✎"}
                </button>

                {/* Banner */}
                {!isEditing && g.bannerImage && (
                  <div style={{ position: "relative", width: "100%", height: 120 }}>
                    <Image src={g.bannerImage} alt="Banner" fill style={{ objectFit: "cover" }} unoptimized />
                  </div>
                )}

                <div style={{ padding: "1rem", paddingRight: isEditing ? "2rem" : "1rem" }}>
                  {isEditing ? (
                    <>
                      <BannerUpload
                        folder="groups"
                        currentUrl={editBanner}
                        onUploaded={(url) => setEditBanner(url)}
                        onRemove={() => setEditBanner(null)}
                      />
                      <label>Gruppenname</label>
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} required />
                      <label>Beschreibung (Links: [Text](https://...))</label>
                      <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={4} required />
                      <label>Maximale Schüler Anzahl</label>
                      <input type="number" min={1} value={editMaxStudents} onChange={(e) => setEditMaxStudents(e.target.value)} required />
                      {editError && <p className="error-text">{editError}</p>}
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button onClick={() => saveEdit(g.id)}>Speichern</button>
                        <button className="secondary" onClick={cancelEdit}>Abbrechen</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h4 style={{ margin: 0 }}>{g.name}</h4>
                      <DescriptionRenderer text={g.description} />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <p style={{ fontSize: "0.85rem", color: "#555", margin: 0 }}>Max. {g.maxStudents} Schüler</p>
                        <button className="danger" onClick={() => handleDelete(g.id)}>Löschen</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

export default function GroupsPage() {
  return (
    <Suspense fallback={<p>Lädt...</p>}>
      <GroupsContent />
    </Suspense>
  );
}
