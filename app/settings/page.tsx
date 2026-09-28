"use client";

import { useEffect, useState, FormEvent } from "react";

type Teacher = { id: string; username: string; createdAt: string };
type Project = { id: string; name: string; code: string };
type Student = {
  id: string; firstName: string; lastName: string; createdAt: string;
  enrolledProject: { id: string; name: string; code: string } | null;
};

export default function SettingsPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [tUsername, setTUsername] = useState("");
  const [tPassword, setTPassword] = useState("");
  const [tError, setTError] = useState("");

  const [projects, setProjects] = useState<Project[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [sFirstName, setSFirstName] = useState("");
  const [sLastName, setSLastName] = useState("");
  const [sProjectId, setSProjectId] = useState("");
  const [sError, setSError] = useState("");

  async function loadTeachers() {
    const res = await fetch("/api/teachers");
    if (res.ok) setTeachers(await res.json());
  }
  async function loadProjects() {
    const res = await fetch("/api/projects");
    if (res.ok) {
      const data = await res.json();
      setProjects(data);
      if (!sProjectId && data.length > 0) setSProjectId(data[0].id);
    }
  }
  async function loadStudents() {
    const res = await fetch("/api/students");
    if (res.ok) setStudents(await res.json());
  }

  useEffect(() => {
    loadTeachers();
    loadProjects();
    loadStudents();
  }, []);

  async function handleTeacherSubmit(e: FormEvent) {
    e.preventDefault();
    setTError("");
    const res = await fetch("/api/teachers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: tUsername, password: tPassword }),
    });
    if (!res.ok) {
      const data = await res.json();
      setTError(data.error || "Fehler beim Anlegen des Lehrers.");
      return;
    }
    setTUsername("");
    setTPassword("");
    loadTeachers();
  }

  async function handleTeacherDelete(id: string) {
    if (!confirm("Diesen Lehrer wirklich löschen?")) return;
    await fetch(`/api/teachers/${id}`, { method: "DELETE" });
    loadTeachers();
  }

  async function handleStudentSubmit(e: FormEvent) {
    e.preventDefault();
    setSError("");
    if (!sProjectId) {
      setSError("Bitte ein Projekt auswählen.");
      return;
    }
    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName: sFirstName, lastName: sLastName, projectId: sProjectId }),
    });
    if (!res.ok) {
      const data = await res.json();
      setSError(data.error || "Fehler beim Anlegen des Schülers.");
      return;
    }
    setSFirstName("");
    setSLastName("");
    loadStudents();
  }

  async function handleStudentDelete(id: string) {
    if (!confirm("Diesen Schüler wirklich löschen?")) return;
    await fetch(`/api/students/${id}`, { method: "DELETE" });
    loadStudents();
  }

  return (
    <div>
      <h1>Einstellungen</h1>

      <h3>Lehrer verwalten</h3>
      <div className="card" style={{ maxWidth: 460 }}>
        <h4 style={{ marginTop: 0 }}>Lehrer hinzufügen</h4>
        <form onSubmit={handleTeacherSubmit}>
          <label>Benutzername</label>
          <input value={tUsername} onChange={(e) => setTUsername(e.target.value)} required />
          <label>Passwort</label>
          <input type="password" value={tPassword} onChange={(e) => setTPassword(e.target.value)} required />
          {tError && <p className="error-text">{tError}</p>}
          <button type="submit">Lehrer anlegen</button>
        </form>
      </div>

      {teachers.length === 0 && <p>Noch keine Lehrer angelegt.</p>}
      {teachers.map((t) => (
        <div key={t.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 460 }}>
          <span>{t.username}</span>
          <button className="danger" onClick={() => handleTeacherDelete(t.id)}>Löschen</button>
        </div>
      ))}

      <h3 style={{ marginTop: "2rem" }}>Schüler verwalten</h3>
      <div className="card" style={{ maxWidth: 460 }}>
        <h4 style={{ marginTop: 0 }}>Schüler hinzufügen</h4>
        <form onSubmit={handleStudentSubmit}>
          <label>Projekt</label>
          <select value={sProjectId} onChange={(e) => setSProjectId(e.target.value)}>
            <option value="">-- Projekt wählen --</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name} (Code: {p.code})</option>
            ))}
          </select>
          <label>Vorname</label>
          <input value={sFirstName} onChange={(e) => setSFirstName(e.target.value)} required />
          <label>Nachname</label>
          <input value={sLastName} onChange={(e) => setSLastName(e.target.value)} required />
          {sError && <p className="error-text">{sError}</p>}
          <button type="submit">Schüler anlegen</button>
        </form>
      </div>

      {students.length === 0 && <p>Noch keine Schüler angelegt.</p>}
      {students.map((s) => (
        <div key={s.id} className="card" style={{ maxWidth: 460 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div>{s.firstName} {s.lastName}</div>
              <div style={{ fontSize: "0.8rem", color: "#555" }}>
                Projekt: {s.enrolledProject?.name || "-"}{" "}
                {s.enrolledProject && <span className="code-badge">{s.enrolledProject.code}</span>}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#555" }}>
                Login: {s.enrolledProject?.code} / {s.firstName?.toLowerCase()}.{s.lastName?.toLowerCase()}
              </div>
            </div>
            <button className="danger" onClick={() => handleStudentDelete(s.id)}>Löschen</button>
          </div>
        </div>
      ))}
    </div>
  );
}
