"use client";

import { useEffect, useState, FormEvent } from "react";

type Teacher = { id: string; username: string; createdAt: string };

export default function SettingsPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [tUsername, setTUsername] = useState("");
  const [tPassword, setTPassword] = useState("");
  const [tError, setTError] = useState("");

  const [pwEditId, setPwEditId] = useState<string | null>(null);
  const [pwValue, setPwValue] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  async function loadTeachers() {
    const res = await fetch("/api/teachers");
    if (res.ok) setTeachers(await res.json());
  }

  useEffect(() => { loadTeachers(); }, []);

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

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* ===== Top Bar ===== */}
      <div className="top-bar">
        <h1>Einstellungen</h1>
        <span className="top-bar-divider" />
        <span className="top-bar-subtitle">Lehrer verwalten</span>
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


      </div>
    </div>
  );
}
