"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BannerUpload from "@/components/BannerUpload";
import { useMe } from "@/components/useMe";
import { apiError, type Project, type ProjectDay, type Teacher } from "@/lib/apiTypes";
import { projectFormToBody, projectToForm, type ProjectFormValues } from "@/lib/forms";

const EMPTY: ProjectFormValues = {
  name: "",
  description: "",
  bannerImage: null,
  maxStudents: "",
  excludedClassIds: [],
  assignedOwnerId: "",
};

/** Formular zum Anlegen (ohne `projectId`) bzw. Bearbeiten eines Projekts innerhalb eines Projekttags. */
export default function ProjectForm({ projectDayId, projectId }: { projectDayId: string; projectId?: string }) {
  const router = useRouter();
  const me = useMe();
  const isSuperuser = me?.role === "SUPERUSER";
  const isEdit = !!projectId;
  const backHref = `/projekttage/${projectDayId}`;

  const [day, setDay] = useState<ProjectDay | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [form, setForm] = useState<ProjectFormValues>(EMPTY);
  const [projectLoaded, setProjectLoaded] = useState(!isEdit);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // `cancelled` verhindert, dass eine veraltete Antwort (z. B. doppelter Effekt im Dev-Modus) Eingaben überschreibt.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/project-days/${projectDayId}`).then(async (res) => {
      if (!res.ok) { const msg = await apiError(res, "Projekttag konnte nicht geladen werden."); if (!cancelled) setLoadError(msg); return; }
      const data: ProjectDay = await res.json();
      if (!cancelled) setDay(data);
    });
    return () => { cancelled = true; };
  }, [projectDayId]);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    fetch(`/api/projects/${projectId}`).then(async (res) => {
      if (!res.ok) { const msg = await apiError(res, "Projekt konnte nicht geladen werden."); if (!cancelled) setLoadError(msg); return; }
      const project: Project = await res.json();
      if (cancelled) return;
      setForm(projectToForm(project));
      setProjectLoaded(true);
    });
    return () => { cancelled = true; };
  }, [projectId]);

  useEffect(() => {
    if (!isSuperuser) return;
    let cancelled = false;
    fetch("/api/teachers")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Teacher[]) => { if (!cancelled) setTeachers(data); });
    return () => { cancelled = true; };
  }, [isSuperuser]);

  function set<K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleExcluded(id: string) {
    set("excludedClassIds", form.excludedClassIds.includes(id)
      ? form.excludedClassIds.filter((x) => x !== id)
      : [...form.excludedClassIds, id]);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const body = projectFormToBody(form, isSuperuser);
    const res = await fetch(isEdit ? `/api/projects/${projectId}` : "/api/projects", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isEdit ? body : { ...body, projectDayId }),
    });
    setSaving(false);
    if (!res.ok) {
      setError(await apiError(res, isEdit ? "Fehler beim Speichern." : "Fehler beim Anlegen des Projekts."));
      return;
    }
    router.push(backHref);
    router.refresh();
  }

  const ready = !!day && projectLoaded && me !== undefined;

  return (
    <div className="new-page-wrapper">
      <div className="top-bar">
        <h1>{isEdit ? "Projekt bearbeiten" : "Neues Projekt anlegen"}</h1>
        {day && <span className="top-bar-subtitle">{day.name}</span>}
        <div className="top-bar-actions">
          <Link href={backHref}>
            <button className="secondary btn-sm">&larr; Zurück</button>
          </Link>
        </div>
      </div>

      <div className="new-page-content">
        <div className="card" style={{ maxWidth: 600, margin: "0 auto" }}>
          {loadError ? (
            <p className="error-text">{loadError}</p>
          ) : !ready ? (
            <p style={{ color: "var(--color-text-faint)" }}>Lädt…</p>
          ) : (
            <form onSubmit={handleSubmit}>
              <BannerUpload
                folder="projects"
                currentUrl={form.bannerImage}
                onUploaded={(url) => set("bannerImage", url)}
                onRemove={() => set("bannerImage", null)}
              />
              <label>Projektname</label>
              <input value={form.name} onChange={(e) => set("name", e.target.value)} required />

              <label>Beschreibung (Links: [Text](https://...))</label>
              <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={4} required />

              <label>Maximale Schüleranzahl</label>
              <input type="number" min={1} value={form.maxStudents} onChange={(e) => set("maxStudents", e.target.value)} required />

              <label>
                Klassen ausschließen
                <span style={{
                  fontWeight: 400, color: "var(--color-text-faint)",
                  marginLeft: "var(--space-2)", fontSize: "var(--text-xs)",
                  textTransform: "none", letterSpacing: 0,
                }}>(optional)</span>
              </label>
              <div className="checkbox-grid">
                {day!.schoolClasses.map((c) => (
                  <label key={c.id}>
                    <input type="checkbox" checked={form.excludedClassIds.includes(c.id)} onChange={() => toggleExcluded(c.id)} />
                    {c.name}
                  </label>
                ))}
              </div>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-faint)", marginTop: "var(--space-1)", marginBottom: 0 }}>
                Schüler ausgeschlossener Klassen sehen dieses Projekt nicht.
              </p>

              {isSuperuser && (
                <>
                  <label style={{ marginTop: "var(--space-4)" }}>
                    Lehrer zuordnen
                    <span style={{
                      fontWeight: 400, color: "var(--color-text-faint)",
                      marginLeft: "var(--space-2)", fontSize: "var(--text-xs)",
                      textTransform: "none", letterSpacing: 0,
                    }}>(optional)</span>
                  </label>
                  <select value={form.assignedOwnerId} onChange={(e) => set("assignedOwnerId", e.target.value)}>
                    <option value="">-- Keinem Lehrer zuordnen --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.username}</option>
                    ))}
                  </select>
                  {!form.assignedOwnerId && (
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-faint)", marginTop: "var(--space-1)", marginBottom: 0 }}>
                      Ohne Lehrer ist das Projekt nur für den Super User sichtbar.
                    </p>
                  )}
                </>
              )}

              {error && <p className="error-text">{error}</p>}
              <button type="submit" disabled={saving} style={{ marginTop: "var(--space-4)", width: "100%" }}>
                {isEdit ? "Speichern" : "Projekt anlegen"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
