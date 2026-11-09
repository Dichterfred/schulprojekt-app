"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BannerUpload from "@/components/BannerUpload";
import { useMe } from "@/components/useMe";
import { apiError, type ProjectDay, type SchoolClass } from "@/lib/apiTypes";
import { projectDayFormToBody, projectDayToForm, type ProjectDayFormValues } from "@/lib/forms";

const EMPTY: ProjectDayFormValues = {
  name: "",
  description: "",
  bannerImage: null,
  schoolClassIds: [],
  startDate: "",
  endDate: "",
  enrollmentDeadline: "",
};

/** Formular zum Anlegen (ohne `dayId`) bzw. Bearbeiten eines Projekttags – nur für den Super User. */
export default function ProjectDayForm({ dayId }: { dayId?: string }) {
  const router = useRouter();
  const me = useMe();
  const isEdit = !!dayId;
  const backHref = isEdit ? `/projekttage/${dayId}` : "/projekttage";

  const [schoolClasses, setSchoolClasses] = useState<SchoolClass[]>([]);
  const [form, setForm] = useState<ProjectDayFormValues>(EMPTY);
  const [loaded, setLoaded] = useState(!isEdit);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // `cancelled` verhindert, dass eine veraltete Antwort (z. B. doppelter Effekt im Dev-Modus) Eingaben überschreibt.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/school-classes")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: SchoolClass[]) => { if (!cancelled) setSchoolClasses(data); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!dayId) return;
    let cancelled = false;
    fetch(`/api/project-days/${dayId}`).then(async (res) => {
      if (!res.ok) { const msg = await apiError(res, "Projekttag konnte nicht geladen werden."); if (!cancelled) setError(msg); return; }
      const day: ProjectDay = await res.json();
      if (cancelled) return;
      setForm(projectDayToForm(day));
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [dayId]);

  function set<K extends keyof ProjectDayFormValues>(key: K, value: ProjectDayFormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleClass(id: string) {
    set("schoolClassIds", form.schoolClassIds.includes(id)
      ? form.schoolClassIds.filter((x) => x !== id)
      : [...form.schoolClassIds, id]);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (form.schoolClassIds.length === 0) {
      setError("Bitte mindestens eine Schulklasse auswählen.");
      return;
    }
    setSaving(true);
    // PATCH verlangt wie POST den vollständigen Body
    const res = await fetch(isEdit ? `/api/project-days/${dayId}` : "/api/project-days", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(projectDayFormToBody(form)),
    });
    setSaving(false);
    if (!res.ok) {
      setError(await apiError(res, isEdit ? "Fehler beim Speichern." : "Fehler beim Anlegen des Projekttags."));
      return;
    }
    const day: ProjectDay = await res.json();
    router.push(`/projekttage/${day.id}`);
    router.refresh();
  }

  const title = isEdit ? "Projekttag bearbeiten" : "Neuen Projekttag anlegen";

  return (
    <div className="new-page-wrapper">
      <div className="top-bar">
        <h1>{title}</h1>
        <div className="top-bar-actions">
          <Link href={backHref}>
            <button className="secondary btn-sm">&larr; Zurück</button>
          </Link>
        </div>
      </div>

      <div className="new-page-content">
        <div className="card" style={{ maxWidth: 600, margin: "0 auto" }}>
          {me && me.role !== "SUPERUSER" ? (
            <p className="error-text">Nur der Super User darf Projekttage anlegen oder bearbeiten.</p>
          ) : !loaded || me === undefined ? (
            error ? <p className="error-text">{error}</p> : <p style={{ color: "var(--color-text-faint)" }}>Lädt…</p>
          ) : (
            <form onSubmit={handleSubmit}>
              <BannerUpload
                folder="projects"
                currentUrl={form.bannerImage}
                onUploaded={(url) => set("bannerImage", url)}
                onRemove={() => set("bannerImage", null)}
              />
              <label>Name</label>
              <input value={form.name} onChange={(e) => set("name", e.target.value)} required />

              <label>Beschreibung (Links: [Text](https://...))</label>
              <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={4} required />

              <label>Schulklassen (mind. eine auswählen)</label>
              <div className="checkbox-grid">
                {schoolClasses.map((c) => (
                  <label key={c.id}>
                    <input type="checkbox" checked={form.schoolClassIds.includes(c.id)} onChange={() => toggleClass(c.id)} />
                    {c.name}
                  </label>
                ))}
              </div>

              {/* Start / Ende nebeneinander, stapelt auf Mobile */}
              <div className="date-row">
                <div>
                  <label>Start (Datum)</label>
                  <input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} required />
                </div>
                <div>
                  <label>Ende (Datum)</label>
                  <input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} required />
                </div>
              </div>

              <label>Einschreibefrist (Datum &amp; Uhrzeit)</label>
              <input
                type="datetime-local"
                value={form.enrollmentDeadline}
                onChange={(e) => set("enrollmentDeadline", e.target.value)}
                required
              />

              {error && <p className="error-text">{error}</p>}
              <button type="submit" disabled={saving} style={{ marginTop: "var(--space-4)", width: "100%" }}>
                {isEdit ? "Speichern" : "Projekttag anlegen"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
