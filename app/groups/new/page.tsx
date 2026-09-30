"use client";

import { useEffect, useState, FormEvent, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import BannerUpload from "@/components/BannerUpload";

type Project = { id: string; name: string; studentCount: number };
type Group = { id: string; maxStudents: number };

function NewGroupContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialProjectId = searchParams.get("projectId") || "";

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);
  const [existingGroups, setExistingGroups] = useState<Group[]>([]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [bannerImage, setBannerImage] = useState<string | null>(null);
  const [maxStudents, setMaxStudents] = useState("");
  const [error, setError] = useState("");

  async function loadProjects() {
    const res = await fetch("/api/projects");
    if (res.ok) {
      const data = await res.json();
      setProjects(data);
      if (!selectedProjectId && data.length > 0) setSelectedProjectId(data[0].id);
    }
  }

  async function loadExistingGroups(pid: string) {
    if (!pid) return;
    const res = await fetch(`/api/groups?projectId=${pid}`);
    if (res.ok) setExistingGroups(await res.json());
  }

  useEffect(() => { loadProjects(); }, []);
  useEffect(() => { if (selectedProjectId) loadExistingGroups(selectedProjectId); }, [selectedProjectId]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const used = existingGroups.reduce((sum, g) => sum + g.maxStudents, 0);
  const remaining = selectedProject ? selectedProject.studentCount - used : 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!selectedProjectId) {
      setError("Bitte ein Projekt auswählen.");
      return;
    }
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, bannerImage, maxStudents: Number(maxStudents), projectId: selectedProjectId }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Fehler beim Anlegen der Gruppe.");
      return;
    }
    router.push(`/groups?projectId=${selectedProjectId}`);
    router.refresh();
  }

  return (
    <div className="new-page-wrapper">

      {/* ── Top Bar ── */}
      <div className="top-bar">
        <h1>Neue Gruppe erstellen</h1>
        <div className="top-bar-actions">
          <Link href="/groups">
            <button className="secondary btn-sm">&larr; Zurück</button>
          </Link>
        </div>
      </div>

      {/* ── Scrollable Content ── */}
      <div className="new-page-content">
        <div className="card" style={{ maxWidth: 480, margin: "0 auto" }}>
          <label>Projekt</label>
          <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} required>
            <option value="">-- Projekt wählen --</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {selectedProject && (
            <p style={{ fontSize: "0.85rem", color: "#555" }}>
              Noch verfügbare Plätze: {remaining} von {selectedProject.studentCount}
            </p>
          )}
          <form onSubmit={handleSubmit}>
            <BannerUpload
              folder="groups"
              currentUrl={bannerImage}
              onUploaded={(url) => setBannerImage(url)}
              onRemove={() => setBannerImage(null)}
            />
            <label>Gruppenname</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
            <label>Beschreibung (Links: [Text](https://...))</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} required />
            <label>Maximale Schüler Anzahl</label>
            <input
              type="number" min={1}
              max={selectedProject && remaining > 0 ? remaining : undefined}
              value={maxStudents}
              onChange={(e) => setMaxStudents(e.target.value)}
              required
            />
            {error && <p className="error-text">{error}</p>}
            <button type="submit" style={{ marginTop: "var(--space-4)", width: "100%" }} disabled={!!selectedProject && remaining <= 0}>Gruppe erstellen</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function NewGroupPage() {
  return (
    <Suspense fallback={<p>Lädt...</p>}>
      <NewGroupContent />
    </Suspense>
  );
}
