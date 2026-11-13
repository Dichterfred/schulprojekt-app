"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { apiError, type ImportResult, type SchoolClass, type Student } from "@/lib/apiTypes";
import {
  importIssueLabel,
  importSummary,
  studentFormToBody,
  studentsPdfBody,
  type ImportIssue,
  type StudentFormValues,
} from "@/lib/forms";
import { downloadStudentsPdf } from "@/lib/download";

const EMPTY_FORM: StudentFormValues = { firstName: "", lastName: "", schoolClassId: "" };

/** Einmalig angezeigte Zugangsdaten (nach Anlegen bzw. „Neues Passwort“) – nur im Speicher, bis ausgeblendet. */
type IssuedCredentials = { name: string; username: string; password: string };

const sectionTitle = {
  fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--color-text-muted)",
  textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "var(--space-4)",
};
const hint = { fontSize: "var(--text-xs)", color: "var(--color-text-faint)", marginTop: "var(--space-1)" };

export default function StudentAdminPage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [filterClassId, setFilterClassId] = useState("");
  const [students, setStudents] = useState<Student[] | null>(null);
  const [listError, setListError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);

  const [issued, setIssued] = useState<IssuedCredentials | null>(null);

  const [createForm, setCreateForm] = useState<StudentFormValues>(EMPTY_FORM);
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<StudentFormValues>(EMPTY_FORM);
  const [editError, setEditError] = useState("");
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [importIssues, setImportIssues] = useState<ImportIssue[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const [pdfClassId, setPdfClassId] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/school-classes")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: SchoolClass[]) => { if (!cancelled) setClasses(data); });
    return () => { cancelled = true; };
  }, []);

  // `cancelled` verhindert, dass eine veraltete Antwort (z. B. nach Filterwechsel) die Liste überschreibt.
  useEffect(() => {
    let cancelled = false;
    const query = filterClassId ? `?classId=${encodeURIComponent(filterClassId)}` : "";
    fetch(`/api/students${query}`).then(async (res) => {
      if (!res.ok) {
        const msg = await apiError(res, "Schüler konnten nicht geladen werden.");
        if (!cancelled) setListError(msg);
        return;
      }
      const data: Student[] = await res.json();
      if (!cancelled) { setStudents(data); setListError(""); }
    });
    return () => { cancelled = true; };
  }, [filterClassId, reloadKey]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreateError("");
    if (!createForm.schoolClassId) { setCreateError("Bitte eine Klasse auswählen."); return; }
    setCreating(true);
    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(studentFormToBody(createForm)),
    });
    setCreating(false);
    if (!res.ok) { setCreateError(await apiError(res, "Fehler beim Anlegen des Schülers.")); return; }
    const data: Student & { password: string } = await res.json();
    setIssued({ name: `${data.firstName} ${data.lastName}`, username: data.username, password: data.password });
    setCreateForm((f) => ({ ...EMPTY_FORM, schoolClassId: f.schoolClassId }));
    reload();
  }

  function startEdit(s: Student) {
    setEditId(s.id);
    setEditForm({ firstName: s.firstName, lastName: s.lastName, schoolClassId: s.schoolClassId });
    setEditError("");
  }

  async function saveEdit(id: string) {
    setEditError("");
    setRowBusyId(id);
    const res = await fetch(`/api/students/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(studentFormToBody(editForm)),
    });
    setRowBusyId(null);
    if (!res.ok) { setEditError(await apiError(res, "Fehler beim Speichern.")); return; }
    setEditId(null);
    reload();
  }

  async function handleDelete(s: Student) {
    if (!confirm(`${s.firstName} ${s.lastName} wirklich löschen? Prioritäten und Zuteilungen werden ebenfalls entfernt.`)) return;
    setRowError("");
    setRowBusyId(s.id);
    const res = await fetch(`/api/students/${s.id}`, { method: "DELETE" });
    setRowBusyId(null);
    if (!res.ok) { setRowError(await apiError(res, "Fehler beim Löschen.")); return; }
    reload();
  }

  async function handleNewPassword(s: Student) {
    if (!confirm(`Neues Passwort für ${s.firstName} ${s.lastName} erzeugen? Das alte Passwort gilt danach nicht mehr und der Schüler wird abgemeldet.`)) return;
    setRowError("");
    setRowBusyId(s.id);
    const res = await fetch(`/api/students/${s.id}/password`, { method: "POST" });
    setRowBusyId(null);
    if (!res.ok) { setRowError(await apiError(res, "Fehler beim Erzeugen des Passworts.")); return; }
    const data: { username: string; password: string } = await res.json();
    setIssued({ name: `${s.firstName} ${s.lastName}`, username: data.username, password: data.password });
  }

  async function handleImport(e: FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    setImportError(""); setImportIssues([]); setImportResult(null);
    if (!file) { setImportError("Bitte eine Excel-Datei (.xlsx) auswählen."); return; }

    const body = new FormData();
    body.append("file", file);
    setImporting(true);
    try {
      // Bewusst ohne Timeout: viele Schüler brauchen wegen bcrypt bis zu 2 Minuten.
      const res = await fetch("/api/students/import", { method: "POST", body });
      if (!res.ok) {
        let message = res.status === 413 ? "Die Datei ist zu groß." : "Der Import ist fehlgeschlagen.";
        let issues: ImportIssue[] = [];
        try {
          const data = await res.json();
          if (typeof data?.error === "string" && data.error) message = data.error;
          if (Array.isArray(data?.errors)) issues = data.errors;
        } catch { /* keine JSON-Antwort (z. B. vom Proxy) */ }
        setImportError(message);
        setImportIssues(issues);
        return;
      }
      setImportResult(await res.json());
      if (fileRef.current) fileRef.current.value = "";
      reload();
    } catch {
      setImportError("Netzwerkfehler beim Import. Bitte prüfen, ob der Import trotzdem durchgelaufen ist, bevor er wiederholt wird.");
    } finally {
      setImporting(false);
    }
  }

  async function runPdf(body: Parameters<typeof downloadStudentsPdf>[0]) {
    setPdfError("");
    setPdfBusy(true);
    const err = await downloadStudentsPdf(body);
    setPdfBusy(false);
    if (err) setPdfError(err);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="top-bar">
        <h1>Schüler</h1>
        <span className="top-bar-divider" />
        <span className="top-bar-subtitle">Anlegen, Import und Zugangsdaten</span>
      </div>

      <div className="page-content">
        {issued && (
          <div className="notice" role="status">
            <div className="notice-title">Zugangsdaten – nur jetzt sichtbar</div>
            <div>{issued.name}</div>
            <div>Anmeldename: <span className="mono">{issued.username}</span></div>
            <div>Passwort: <span className="mono" style={{ fontWeight: 700 }}>{issued.password}</span></div>
            <div className="btn-group" style={{ marginTop: "var(--space-3)" }}>
              <button type="button" className="secondary btn-sm" onClick={() => setIssued(null)}>Ausblenden</button>
            </div>
          </div>
        )}

        <div className="settings-grid">
          {/* ── Schüler anlegen ── */}
          <div className="card" style={{ margin: 0 }}>
            <div style={sectionTitle}>Schüler anlegen</div>
            <form onSubmit={handleCreate}>
              <label style={{ marginTop: 0 }}>Klasse</label>
              <select
                value={createForm.schoolClassId}
                onChange={(e) => setCreateForm((f) => ({ ...f, schoolClassId: e.target.value }))}
                required
              >
                <option value="">-- Klasse --</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <label>Vorname</label>
              <input value={createForm.firstName} onChange={(e) => setCreateForm((f) => ({ ...f, firstName: e.target.value }))} required />
              <label>Nachname</label>
              <input value={createForm.lastName} onChange={(e) => setCreateForm((f) => ({ ...f, lastName: e.target.value }))} required />
              {createError && <p className="error-text">{createError}</p>}
              <button type="submit" disabled={creating} style={{ marginTop: "var(--space-3)" }}>Schüler anlegen</button>
            </form>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            {/* ── Excel-Import ── */}
            <div className="card" style={{ margin: 0 }}>
              <div style={sectionTitle}>Excel importieren</div>
              <form onSubmit={handleImport}>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  disabled={importing}
                />
                <p style={hint}>
                  Erstes Tabellenblatt mit Kopfzeile <span className="mono">Vorname</span>, <span className="mono">Nachname</span>,{" "}
                  <span className="mono">Klasse</span> (Reihenfolge und Groß-/Kleinschreibung egal). Nur .xlsx, max. 5 MB und 2000 Zeilen.
                  Bei Fehlern wird nichts angelegt.
                </p>
                <button type="submit" disabled={importing} style={{ marginTop: "var(--space-2)" }}>
                  {importing ? "Import läuft…" : "Importieren"}
                </button>
              </form>

              {importing && (
                <p role="status" style={{ ...hint, display: "flex", alignItems: "center", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
                  <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                  Import läuft – das kann bei vielen Schülern bis zu 2 Minuten dauern.
                </p>
              )}

              {importError && (
                <div className="error-banner" style={{ marginTop: "var(--space-3)", flexDirection: "column", gap: 0 }}>
                  <div>{importError}</div>
                  {importIssues.length > 0 && (
                    <ul className="issue-list">
                      {importIssues.map((i, idx) => <li key={idx}>{importIssueLabel(i)}</li>)}
                    </ul>
                  )}
                </div>
              )}

              {importResult && (
                <div className="notice" role="status" style={{ marginTop: "var(--space-3)", marginBottom: 0 }}>
                  <div className="notice-title">Import abgeschlossen</div>
                  <div>{importSummary(importResult)}</div>
                  {importResult.skipped.length > 0 && (
                    <>
                      <div style={{ marginTop: "var(--space-2)", fontSize: "var(--text-xs)" }}>Übersprungen (bereits vorhanden):</div>
                      <ul className="issue-list">
                        {importResult.skipped.map((i, idx) => <li key={idx}>{importIssueLabel(i)}</li>)}
                      </ul>
                    </>
                  )}
                  {importResult.studentIds.length > 0 && (
                    <button
                      type="button"
                      className="btn-sm"
                      disabled={pdfBusy}
                      style={{ marginTop: "var(--space-3)" }}
                      onClick={() => runPdf({ studentIds: importResult.studentIds })}
                    >
                      PDF der neuen Schüler
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ── PDF-Export ── */}
            <div className="card" style={{ margin: 0 }}>
              <div style={sectionTitle}>PDF erzeugen</div>
              <div className="btn-group">
                <select value={pdfClassId} onChange={(e) => setPdfClassId(e.target.value)} style={{ flex: 1, marginBottom: 0 }}>
                  <option value="">Alle Klassen</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button type="button" disabled={pdfBusy} onClick={() => runPdf(studentsPdfBody(pdfClassId))} style={{ flexShrink: 0 }}>
                  {pdfBusy ? "Erzeugt…" : "PDF erzeugen"}
                </button>
              </div>
              <p style={hint}>Zugangsdaten mit Anmeldename und Passwort, eine Seite pro Klasse.</p>
              {pdfError && <p className="error-text">{pdfError}</p>}
            </div>
          </div>
        </div>

        {/* ── Schülerliste ── */}
        <div className="sort-bar">
          <h2 style={{ margin: 0 }}>Schülerliste</h2>
          <select value={filterClassId} onChange={(e) => { setFilterClassId(e.target.value); setEditId(null); }} aria-label="Klasse filtern">
            <option value="">Alle Klassen</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {students && <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-faint)" }}>{students.length} Schüler</span>}
        </div>

        {listError && <p className="error-text">{listError}</p>}
        {rowError && <p className="error-text">{rowError}</p>}
        {students === null && !listError && <p style={{ color: "var(--color-text-faint)" }}>Lädt…</p>}
        {students?.length === 0 && <p style={{ color: "var(--color-text-faint)", fontSize: "var(--text-sm)" }}>Keine Schüler vorhanden.</p>}

        {students && students.length > 0 && (
          <div className="card table-wrap" style={{ margin: 0, padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr><th>Nachname</th><th>Vorname</th><th>Klasse</th><th>Anmeldename</th><th /></tr>
              </thead>
              <tbody>
                {students.map((s) => editId === s.id ? (
                  <tr key={s.id}>
                    <td><input aria-label="Nachname" value={editForm.lastName} onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))} /></td>
                    <td><input aria-label="Vorname" value={editForm.firstName} onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))} /></td>
                    <td>
                      <select aria-label="Klasse" value={editForm.schoolClassId} onChange={(e) => setEditForm((f) => ({ ...f, schoolClassId: e.target.value }))}>
                        {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </td>
                    <td>
                      <span className="mono">{s.username}</span>
                      {editError && <p className="error-text" style={{ marginBottom: 0 }}>{editError}</p>}
                    </td>
                    <td className="actions">
                      <button className="btn-sm" disabled={rowBusyId === s.id} onClick={() => saveEdit(s.id)}>Speichern</button>
                      <button className="secondary btn-sm" onClick={() => setEditId(null)}>Abbrechen</button>
                    </td>
                  </tr>
                ) : (
                  <tr key={s.id}>
                    <td>{s.lastName}</td>
                    <td>{s.firstName}</td>
                    <td><span className="class-badge">{s.schoolClass.name}</span></td>
                    <td className="mono">{s.username}</td>
                    <td className="actions">
                      <button className="secondary btn-sm" disabled={rowBusyId === s.id} onClick={() => startEdit(s)}>Bearbeiten</button>
                      <button className="secondary btn-sm" disabled={rowBusyId === s.id} onClick={() => handleNewPassword(s)}>Neues Passwort</button>
                      <button className="danger btn-sm" disabled={rowBusyId === s.id} onClick={() => handleDelete(s)}>Löschen</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
