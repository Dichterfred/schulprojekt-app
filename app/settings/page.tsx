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
        <h1 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, letterSpacing: "-0.02em" }}>Einstellungen</h1>
        <div style={{ width: 1, height: 22, background: "#E5E5EA", flexShrink: 0 }} />
        <span style={{ fontSize: "0.82rem", color: "#6C6C70" }}>Lehrer &amp; Schüler verwalten</span>
      </div>

      {/* ===== Scrollable Content ===== */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1.75rem 2rem 4rem" }}>

        {/* ── Lehrer ── */}
        <div style={{ marginBottom: "0.75rem" }}>
          <h2 style={{ margin: 0 }}>Lehrer</h2>
        </div>

        {/* Lehrer Form + Liste nebeneinander auf breiten Screens */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 420px) 1fr", gap: "1.25rem", alignItems: "start", marginBottom: "2rem" }}>

          {/* Formular */}
          <div className="card" style={{ margin: 0 }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#6C6C70", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "1rem" }}>
              Neuen Lehrer anlegen
            </div>
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

          {/* Lehrerliste */}
          <div>
            {teachers.length === 0 ? (
              <p style={{ color: "#AEAEB2", fontSize: "0.9rem", paddingTop: "0.5rem" }}>Noch keine Lehrer angelegt.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.6rem" }}>
                {teachers.map((t) => (
                  <div key={t.id} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "white",
                    borderRadius: 12,
                    padding: "0.85rem 1rem",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                    border: "1px solid rgba(0,0,0,0.04)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", minWidth: 0 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                        background: "linear-gradient(135deg,#007AFF,#34AADC)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "white", fontWeight: 700, fontSize: "0.85rem",
                      }}>
                        {t.username.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.username}</span>
                    </div>
                    <button className="danger" style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem", flexShrink: 0, marginLeft: "0.5rem" }} onClick={() => handleTeacherDelete(t.id)}>Löschen</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "#E5E5EA", marginBottom: "1.75rem" }} />

        {/* ── Schüler ── */}
        <div style={{ marginBottom: "0.75rem" }}>
          <h2 style={{ margin: 0 }}>Schüler</h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 420px) 1fr", gap: "1.25rem", alignItems: "start" }}>

          {/* Formular */}
          <div className="card" style={{ margin: 0 }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#6C6C70", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "1rem" }}>
              Neuen Schüler anlegen
            </div>
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

          {/* Schülerliste */}
          <div>
            {students.length === 0 ? (
              <p style={{ color: "#AEAEB2", fontSize: "0.9rem", paddingTop: "0.5rem" }}>Noch keine Schüler angelegt.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.6rem" }}>
                {students.map((s) => (
                  <div key={s.id} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "white",
                    borderRadius: 12,
                    padding: "0.85rem 1rem",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                    border: "1px solid rgba(0,0,0,0.04)",
                    gap: "0.75rem",
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, marginBottom: "0.15rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {s.firstName} {s.lastName}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#6C6C70", display: "flex", gap: "0.4rem", alignItems: "center" }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.enrolledProject?.name || "—"}</span>
                        {s.enrolledProject && <span className="code-badge">{s.enrolledProject.code}</span>}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#AEAEB2", marginTop: "0.15rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {s.enrolledProject?.code} / {s.firstName?.toLowerCase()}.{s.lastName?.toLowerCase()}
                      </div>
                    </div>
                    <button className="danger" style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem", flexShrink: 0 }} onClick={() => handleStudentDelete(s.id)}>Löschen</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
