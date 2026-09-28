"use client";

import { useEffect, useState, FormEvent } from "react";

type Teacher = { id: string; username: string; createdAt: string };
type Project = { id: string; name: string; code: string };
type Student = {
  id: string; firstName: string; lastName: string; createdAt: string;
  enrolledProject: { id: string; name: string; code: string } | null;
};

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ margin: "2rem 0 1rem" }}>
      <h2 style={{ margin: 0 }}>{title}</h2>
    </div>
  );
}

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

  useEffect(() => { loadTeachers(); loadProjects(); loadStudents(); }, []);

  async function handleTeacherSubmit(e: FormEvent) {
    e.preventDefault();
    setTError("");
    const res = await fetch("/api/teachers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: tUsername, password: tPassword }),
    });
    if (!res.ok) { const data = await res.json(); setTError(data.error || "Fehler beim Anlegen des Lehrers."); return; }
    setTUsername(""); setTPassword("");
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
    if (!sProjectId) { setSError("Bitte ein Projekt auswählen."); return; }
    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName: sFirstName, lastName: sLastName, projectId: sProjectId }),
    });
    if (!res.ok) { const data = await res.json(); setSError(data.error || "Fehler beim Anlegen des Schülers."); return; }
    setSFirstName(""); setSLastName("");
    loadStudents();
  }

  async function handleStudentDelete(id: string) {
    if (!confirm("Diesen Schüler wirklich löschen?")) return;
    await fetch(`/api/students/${id}`, { method: "DELETE" });
    loadStudents();
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ marginBottom: "0.5rem" }}>
        <h1>Einstellungen</h1>
        <p style={{ color: "#6C6C70", marginTop: "0.4rem", fontSize: "0.9rem" }}>Lehrer und Schüler verwalten</p>
      </div>

      {/* ===== Lehrer ===== */}
      <SectionHeader title="Lehrer verwalten" />

      <div className="card">
        <h4 style={{ marginBottom: "1rem", color: "#6C6C70", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700 }}>Neuen Lehrer anlegen</h4>
        <form onSubmit={handleTeacherSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
            <div>
              <label style={{ marginTop: 0 }}>Benutzername</label>
              <input value={tUsername} onChange={(e) => setTUsername(e.target.value)} autoComplete="off" required />
            </div>
            <div>
              <label style={{ marginTop: 0 }}>Passwort</label>
              <input type="password" value={tPassword} onChange={(e) => setTPassword(e.target.value)} autoComplete="new-password" required />
            </div>
          </div>
          {tError && <p className="error-text">{tError}</p>}
          <button type="submit">Lehrer anlegen</button>
        </form>
      </div>

      {teachers.length === 0 ? (
        <p style={{ color: "#AEAEB2", fontSize: "0.9rem" }}>Noch keine Lehrer angelegt.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {teachers.map((t) => (
            <div key={t.id} style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "white",
              borderRadius: 12,
              padding: "0.85rem 1.1rem",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              border: "1px solid rgba(0,0,0,0.04)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: "linear-gradient(135deg,#007AFF,#34AADC)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "white", fontWeight: 700, fontSize: "0.85rem",
                }}>
                  {t.username.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontWeight: 500 }}>{t.username}</span>
              </div>
              <button className="danger" style={{ padding: "0.4rem 0.85rem", fontSize: "0.82rem" }} onClick={() => handleTeacherDelete(t.id)}>Löschen</button>
            </div>
          ))}
        </div>
      )}

      {/* ===== Schüler ===== */}
      <SectionHeader title="Schüler verwalten" />

      <div className="card">
        <h4 style={{ marginBottom: "1rem", color: "#6C6C70", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700 }}>Neuen Schüler anlegen</h4>
        <form onSubmit={handleStudentSubmit}>
          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ marginTop: 0 }}>Projekt</label>
            <select value={sProjectId} onChange={(e) => setSProjectId(e.target.value)}>
              <option value="">-- Projekt wählen --</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name} (Code: {p.code})</option>
              ))}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
            <div>
              <label>Vorname</label>
              <input value={sFirstName} onChange={(e) => setSFirstName(e.target.value)} required />
            </div>
            <div>
              <label>Nachname</label>
              <input value={sLastName} onChange={(e) => setSLastName(e.target.value)} required />
            </div>
          </div>
          {sError && <p className="error-text">{sError}</p>}
          <button type="submit">Schüler anlegen</button>
        </form>
      </div>

      {students.length === 0 ? (
        <p style={{ color: "#AEAEB2", fontSize: "0.9rem" }}>Noch keine Schüler angelegt.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "4rem" }}>
          {students.map((s) => (
            <div key={s.id} style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "white",
              borderRadius: 12,
              padding: "0.85rem 1.1rem",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              border: "1px solid rgba(0,0,0,0.04)",
            }}>
              <div>
                <div style={{ fontWeight: 600, marginBottom: "0.15rem" }}>{s.firstName} {s.lastName}</div>
                <div style={{ fontSize: "0.8rem", color: "#6C6C70", display: "flex", gap: "0.4rem", alignItems: "center" }}>
                  <span>{s.enrolledProject?.name || "—"}</span>
                  {s.enrolledProject && <span className="code-badge">{s.enrolledProject.code}</span>}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#AEAEB2", marginTop: "0.15rem" }}>
                  Login: {s.enrolledProject?.code} / {s.firstName?.toLowerCase()}.{s.lastName?.toLowerCase()}
                </div>
              </div>
              <button className="danger" style={{ padding: "0.4rem 0.85rem", fontSize: "0.82rem" }} onClick={() => handleStudentDelete(s.id)}>Löschen</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
