"use client";

import { useEffect, useState, FormEvent } from "react";

type Teacher = { id: string; username: string; createdAt: string };
type Project = { id: string; name: string; code: string; schoolClasses: { id: string }[] };
type SchoolClass = { id: string; name: string };
type Student = {
  id: string; firstName: string; lastName: string; createdAt: string;
  schoolClass: { id: string; name: string };
  enrollments: { id: string; project: { id: string; name: string; code: string } }[];
};
/** Frisch erzeugte Zugangsdaten – die PIN ist nur jetzt sichtbar, gespeichert wird nur ihr Hash. */
type IssuedPin = { name: string; projectCode: string; pin: string };

export default function SettingsPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [tUsername, setTUsername] = useState("");
  const [tPassword, setTPassword] = useState("");
  const [tError, setTError] = useState("");

  const [pwEditId, setPwEditId] = useState<string | null>(null);
  const [pwValue, setPwValue] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  const [projects, setProjects] = useState<Project[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [sFirstName, setSFirstName] = useState("");
  const [sLastName, setSLastName] = useState("");
  const [sClassId, setSClassId] = useState("");
  const [sProjectId, setSProjectId] = useState("");
  const [sError, setSError] = useState("");
  const [schoolClasses, setSchoolClasses] = useState<SchoolClass[]>([]);
  const [issuedPins, setIssuedPins] = useState<IssuedPin[]>([]);
  const [enrollSelect, setEnrollSelect] = useState<Record<string, string>>({});

  async function loadTeachers() {
    const res = await fetch("/api/teachers");
    if (res.ok) setTeachers(await res.json());
  }
  async function loadProjects() {
    const res = await fetch("/api/projects");
    if (res.ok) setProjects(await res.json());
  }
  async function loadSchoolClasses() {
    const res = await fetch("/api/school-classes");
    if (res.ok) setSchoolClasses(await res.json());
  }
  async function loadStudents() {
    const res = await fetch("/api/students");
    if (res.ok) setStudents(await res.json());
  }

  useEffect(() => { loadTeachers(); loadProjects(); loadStudents(); loadSchoolClasses(); }, []);

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

  function openPwEdit(id: string) {
    setPwEditId(id); setPwValue(""); setPwError(""); setPwSuccess("");
  }
  function closePwEdit() { setPwEditId(null); }

  async function handlePasswordReset(id: string) {
    setPwError(""); setPwSuccess("");
    const res = await fetch(`/api/teachers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pwValue }),
    });
    if (!res.ok) { const data = await res.json(); setPwError(data.error || "Fehler."); return; }
    setPwSuccess("Passwort geändert.");
    setTimeout(() => { closePwEdit(); }, 1200);
  }

  async function enroll(student: { id: string; firstName: string; lastName: string }, projectId: string): Promise<string | null> {
    const res = await fetch(`/api/projects/${projectId}/enrollments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: student.id }),
    });
    const data = await res.json();
    if (!res.ok) return data.error || "Fehler beim Einschreiben.";
    setIssuedPins((prev) => [...prev, { name: `${student.firstName} ${student.lastName}`, projectCode: data.projectCode, pin: data.pin }]);
    return null;
  }

  async function handleStudentSubmit(e: FormEvent) {
    e.preventDefault();
    setSError("");
    if (!sClassId) { setSError("Bitte eine Klasse auswählen."); return; }
    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName: sFirstName, lastName: sLastName, schoolClassId: sClassId }),
    });
    const data = await res.json();
    if (!res.ok) { setSError(data.error || "Fehler beim Anlegen des Schülers."); return; }
    if (sProjectId) {
      const err = await enroll(data, sProjectId);
      if (err) setSError(`Schüler angelegt, aber nicht eingeschrieben: ${err}`);
    }
    setSFirstName(""); setSLastName("");
    loadStudents();
  }

  async function handleEnroll(student: Student) {
    const projectId = enrollSelect[student.id];
    if (!projectId) return;
    const err = await enroll(student, projectId);
    if (err) { alert(err); return; }
    setEnrollSelect((prev) => ({ ...prev, [student.id]: "" }));
    loadStudents();
  }

  async function handleUnenroll(enrollmentId: string) {
    if (!confirm("Schüler aus diesem Projekt austragen? Seine Prioritäten werden gelöscht.")) return;
    const res = await fetch(`/api/enrollments/${enrollmentId}`, { method: "DELETE" });
    if (!res.ok) { alert((await res.json()).error || "Fehler beim Austragen."); return; }
    loadStudents();
  }

  async function handleNewPin(student: Student, enrollmentId: string) {
    if (!confirm("Neue PIN erzeugen? Die bisherige PIN funktioniert danach nicht mehr.")) return;
    const res = await fetch(`/api/enrollments/${enrollmentId}/pin`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) { alert(data.error || "Fehler beim Erzeugen der PIN."); return; }
    setIssuedPins((prev) => [...prev, { name: `${student.firstName} ${student.lastName}`, projectCode: data.projectCode, pin: data.pin }]);
  }

  async function handleStudentDelete(id: string) {
    if (!confirm("Diesen Schüler wirklich löschen? Alle Einschreibungen werden entfernt.")) return;
    const res = await fetch(`/api/students/${id}`, { method: "DELETE" });
    if (!res.ok) { alert((await res.json()).error || "Fehler beim Löschen."); return; }
    loadStudents();
  }

  const projectsForClass = (classId: string) => projects.filter((p) => p.schoolClasses.some((c) => c.id === classId));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* ===== Top Bar ===== */}
      <div className="top-bar">
        <h1>Einstellungen</h1>
        <span className="top-bar-divider" />
        <span className="top-bar-subtitle">Lehrer &amp; Schüler verwalten</span>
      </div>

      {/* ===== Scrollable Content ===== */}
      <div className="page-content">

        {/* ── Lehrer ── */}
        <h2 style={{ marginBottom: "var(--space-3)" }}>Lehrer</h2>

        <div className="settings-grid">

          {/* Anlegen-Formular */}
          <div className="card" style={{ margin: 0 }}>
            <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "var(--space-4)" }}>
              Neuen Lehrer anlegen
            </div>
            <form onSubmit={handleTeacherSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
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
              <p style={{ color: "var(--color-text-faint)", fontSize: "var(--text-sm)", paddingTop: "var(--space-2)" }}>Noch keine Lehrer angelegt.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "var(--space-2)" }}>
                {teachers.map((t) => (
                  <div key={t.id} className="item-card">
                    <div className="item-card-row">
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", minWidth: 0 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                          background: "linear-gradient(135deg,#007AFF,#34AADC)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "white", fontWeight: 700, fontSize: "var(--text-sm)",
                        }}>
                          {t.username.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.username}</span>
                      </div>
                      <div className="btn-group" style={{ flexShrink: 0 }}>
                        <button
                          className="secondary btn-sm"
                          onClick={() => pwEditId === t.id ? closePwEdit() : openPwEdit(t.id)}
                        >
                          {pwEditId === t.id ? "✕" : "🔑 PW"}
                        </button>
                        <button className="danger btn-sm" onClick={() => handleTeacherDelete(t.id)}>Löschen</button>
                      </div>
                    </div>

                    {pwEditId === t.id && (
                      <div className="item-card-panel">
                        <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "var(--space-2)" }}>
                          Neues Passwort
                        </div>
                        <div className="btn-group">
                          <input
                            type="password"
                            placeholder="Neues Passwort"
                            value={pwValue}
                            onChange={(e) => setPwValue(e.target.value)}
                            autoComplete="new-password"
                            style={{ flex: 1, marginBottom: 0 }}
                          />
                          <button onClick={() => handlePasswordReset(t.id)} style={{ flexShrink: 0 }}>
                            Speichern
                          </button>
                        </div>
                        {pwError && <p className="error-text" style={{ marginTop: "var(--space-1)" }}>{pwError}</p>}
                        {pwSuccess && <p className="success-text" style={{ marginTop: "var(--space-1)" }}>{pwSuccess}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="section-divider" />

        {/* ── Schüler ── */}
        <h2 style={{ marginBottom: "var(--space-3)" }}>Schüler</h2>

        <div className="settings-grid">
          <div className="card" style={{ margin: 0 }}>
            <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "var(--space-4)" }}>
              Neuen Schüler anlegen
            </div>
            <form onSubmit={handleStudentSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
                <div>
                  <label style={{ marginTop: 0 }}>Klasse</label>
                  <select value={sClassId} onChange={(e) => { setSClassId(e.target.value); setSProjectId(""); }} required>
                    <option value="">-- Klasse --</option>
                    {schoolClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ marginTop: 0 }}>Projekt (optional)</label>
                  <select value={sProjectId} onChange={(e) => setSProjectId(e.target.value)} disabled={!sClassId}>
                    <option value="">-- keins --</option>
                    {projectsForClass(sClassId).map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
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

            {issuedPins.length > 0 && (
              <div className="item-card-panel" style={{ marginTop: "var(--space-4)" }}>
                <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "var(--space-2)" }}>
                  Neue Zugangsdaten – nur jetzt sichtbar
                </div>
                <table style={{ width: "100%", fontSize: "var(--text-sm)", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ textAlign: "left" }}><th>Name</th><th>Projekt-Code</th><th>PIN</th></tr>
                  </thead>
                  <tbody>
                    {issuedPins.map((p, i) => (
                      <tr key={i}><td>{p.name}</td><td><span className="code-badge">{p.projectCode}</span></td><td style={{ fontFamily: "monospace", fontWeight: 700 }}>{p.pin}</td></tr>
                    ))}
                  </tbody>
                </table>
                <div className="btn-group" style={{ marginTop: "var(--space-3)" }}>
                  <button type="button" className="secondary btn-sm" onClick={() => window.print()}>Drucken</button>
                  <button type="button" className="secondary btn-sm" onClick={() => setIssuedPins([])}>Ausblenden</button>
                </div>
              </div>
            )}
          </div>

          <div>
            {students.length === 0 ? (
              <p style={{ color: "var(--color-text-faint)", fontSize: "var(--text-sm)", paddingTop: "var(--space-2)" }}>Noch keine Schüler angelegt.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "var(--space-2)" }}>
                {students.map((s) => (
                  <div key={s.id} className="item-card">
                    <div className="item-card-row">
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, marginBottom: "var(--space-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {s.firstName} {s.lastName}
                        </div>
                        <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                          <span className="class-badge">{s.schoolClass.name}</span>{" "}
                          Login: {s.firstName.toLowerCase()}.{s.lastName.toLowerCase()}
                        </div>
                      </div>
                      <button className="danger btn-sm" style={{ flexShrink: 0 }} onClick={() => handleStudentDelete(s.id)}>Löschen</button>
                    </div>
                    <div className="item-card-panel">
                      {s.enrollments.length === 0 && (
                        <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-faint)" }}>In keinem Projekt eingeschrieben.</div>
                      )}
                      {s.enrollments.map((e) => (
                        <div key={e.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-xs)", marginBottom: "var(--space-2)" }}>
                          <span style={{ flexBasis: "100%", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.project.name}</span>
                          <span className="code-badge">{e.project.code}</span>
                          <button className="secondary btn-sm" onClick={() => handleNewPin(s, e.id)}>Neue PIN</button>
                          <button className="danger btn-sm" title="Austragen" onClick={() => handleUnenroll(e.id)}>✕</button>
                        </div>
                      ))}
                      {(() => {
                        const available = projectsForClass(s.schoolClass.id).filter((p) => !s.enrollments.some((e) => e.project.id === p.id));
                        if (available.length === 0) return null;
                        return (
                          <div className="btn-group" style={{ marginTop: "var(--space-2)" }}>
                            <select
                              value={enrollSelect[s.id] ?? ""}
                              onChange={(ev) => setEnrollSelect((prev) => ({ ...prev, [s.id]: ev.target.value }))}
                              style={{ flex: 1, marginBottom: 0 }}
                            >
                              <option value="">-- Projekt --</option>
                              {available.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <button className="btn-sm" disabled={!enrollSelect[s.id]} onClick={() => handleEnroll(s)}>Einschreiben</button>
                          </div>
                        );
                      })()}
                    </div>
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
