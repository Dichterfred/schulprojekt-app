"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type SchoolClass = { id: string; name: string; sortOrder: number };

export default function NewProjectPage() {
  const router = useRouter();
  const [schoolClasses, setSchoolClasses] = useState<SchoolClass[]>([]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
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
  }, []);

  function toggleClass(id: string) {
    setSelectedClassIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (selectedClassIds.length === 0) {
      setError("Bitte mindestens eine Schulklasse auswählen.");
      return;
    }

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        studentCount: Number(studentCount),
        schoolClassIds: selectedClassIds,
        startDate: `${startDate}T00:00:00.000Z`,
        endDate: `${endDate}T23:59:59.999Z`,
        enrollmentDeadline: new Date(enrollmentDeadline).toISOString(),
      }),
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
    <div>
      <div className="page-header">
        <h1 style={{ margin: 0 }}>Neues Projekt erstellen</h1>
        <Link href="/projects"><button className="secondary">&larr; Zur Projektliste</button></Link>
      </div>

      <div className="card" style={{ maxWidth: 480 }}>
        <form onSubmit={handleSubmit}>
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
          <label>Beschreibung</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} required />
          <label>Schüler Anzahl</label>
          <input type="number" min={1} value={studentCount} onChange={(e) => setStudentCount(e.target.value)} required />

          <label>Schulklassen (mind. eine auswählen)</label>
          <div className="checkbox-grid">
            {schoolClasses.map((c) => (
              <label key={c.id}>
                <input type="checkbox" checked={selectedClassIds.includes(c.id)} onChange={() => toggleClass(c.id)} />
                {c.name}
              </label>
            ))}
          </div>

          <label>Start (Datum, ohne Uhrzeit — gilt als Tagesanfang)</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          <label>Ende (Datum, ohne Uhrzeit — gilt als Tagesende)</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
          <label>Einschreibefrist (Datum &amp; Uhrzeit, bis wann Gruppenanmeldung möglich ist)</label>
          <input type="datetime-local" value={enrollmentDeadline} onChange={(e) => setEnrollmentDeadline(e.target.value)} required />

          {error && <p className="error-text">{error}</p>}
          <button type="submit">Projekt erstellen</button>
        </form>
      </div>
    </div>
  );
}
