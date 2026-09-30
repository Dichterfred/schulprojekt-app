"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import BannerUpload from "@/components/BannerUpload";

type SchoolClass = { id: string; name: string; sortOrder: number };
type Teacher = { id: string; username: string };

export default function NewProjectPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isSuperUser = session?.user?.role === "SUPERUSER";

  const [schoolClasses, setSchoolClasses] = useState<SchoolClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [assignedOwnerId, setAssignedOwnerId] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [bannerImage, setBannerImage] = useState<string | null>(null);
  const [studentCount, setStudentCount] = useState("");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [enrollmentDeadline, setEnrollmentDeadline] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/school-classes")
      .then((res) => (res.ok ? res.json() : []))
      .then(setSchoolClasses);
    if (isSuperUser) {
      fetch("/api/teachers")
        .then((res) => (res.ok ? res.json() : []))
        .then(setTeachers);
    }
  }, [isSuperUser]);

  function toggleClass(id: string) {
    setSelectedClassIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (selectedClassIds.length === 0) {
      setError("Bitte mindestens eine Schulklasse auswählen.");
      return;
    }
    const body: Record<string, unknown> = {
      name,
      description,
      bannerImage,
      studentCount: Number(studentCount),
      schoolClassIds: selectedClassIds,
      startDate: `${startDate}T00:00:00.000Z`,
      endDate: `${endDate}T23:59:59.999Z`,
      enrollmentDeadline: new Date(enrollmentDeadline).toISOString(),
    };
    if (isSuperUser && assignedOwnerId) body.assignedOwnerId = assignedOwnerId;
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Fehler beim Anlegen des Projekts.");
      return;
    }
    router.push("/projects");
    router.refresh();
  }

  return (
    <div className="new-page-wrapper">

      {/* ── Top Bar ── */}
      <div className="top-bar">
        <h1>Neues Projekt erstellen</h1>
        <div className="top-bar-actions">
          <Link href="/projects">
            <button className="secondary btn-sm">&larr; Zurück</button>
          </Link>
        </div>
      </div>

      {/* ── Scrollable Content ── */}
      <div className="new-page-content">

        {/*
          Desktop: 2 Spalten — Formular links (max 520px), rechts freier Bereich
          Mobile:  1 Spalte  — Formular volle Breite
        */}
        <div className="new-project-layout">

          {/* Linke Spalte: Formular-Card */}
          <div className="card" style={{ margin: 0 }}>
            <form onSubmit={handleSubmit}>
              <BannerUpload
                folder="projects"
                currentUrl={bannerImage}
                onUploaded={(url) => setBannerImage(url)}
                onRemove={() => setBannerImage(null)}
              />
              <label>Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />

              <label>Beschreibung (Links: [Text](https://...))</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                required
              />

              <label>Schüler Anzahl</label>
              <input
                type="number"
                min={1}
                value={studentCount}
                onChange={(e) => setStudentCount(e.target.value)}
                required
              />

              <label>Schulklassen (mind. eine auswählen)</label>
              <div className="checkbox-grid">
                {schoolClasses.map((c) => (
                  <label key={c.id}>
                    <input
                      type="checkbox"
                      checked={selectedClassIds.includes(c.id)}
                      onChange={() => toggleClass(c.id)}
                    />
                    {c.name}
                  </label>
                ))}
              </div>

              {/* Start / Ende nebeneinander, stapelt auf Mobile */}
              <div className="date-row">
                <div>
                  <label>Start (Datum)</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label>Ende (Datum)</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <label>Einschreibefrist (Datum &amp; Uhrzeit)</label>
              <input
                type="datetime-local"
                value={enrollmentDeadline}
                onChange={(e) => setEnrollmentDeadline(e.target.value)}
                required
              />

              {isSuperUser && (
                <>
                  <label style={{ marginTop: "var(--space-4)" }}>
                    Lehrer zuordnen
                    <span style={{
                      fontWeight: 400, color: "var(--color-text-faint)",
                      marginLeft: "var(--space-2)", fontSize: "var(--text-xs)",
                      textTransform: "none", letterSpacing: 0,
                    }}>(optional)</span>
                  </label>
                  <select value={assignedOwnerId} onChange={(e) => setAssignedOwnerId(e.target.value)}>
                    <option value="">-- Keinem Lehrer zuordnen --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.username}</option>
                    ))}
                  </select>
                  {!assignedOwnerId && (
                    <p style={{
                      fontSize: "var(--text-xs)", color: "var(--color-text-faint)",
                      marginTop: "var(--space-1)", marginBottom: 0,
                    }}>
                      Wenn kein Lehrer gewählt wird, erscheint das Projekt unter deinem Super-User-Konto.
                    </p>
                  )}
                </>
              )}

              {error && <p className="error-text">{error}</p>}
              <button type="submit" style={{ marginTop: "var(--space-4)", width: "100%" }}>
                Projekt erstellen
              </button>
            </form>
          </div>

          {/* Rechte Spalte: leer (Platz für zukünftige Inhalte / visuelles Gleichgewicht) */}
          <div />
        </div>
      </div>
    </div>
  );
}
