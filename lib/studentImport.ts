import ExcelJS from "exceljs";

export const MAX_IMPORT_ROWS = 2000;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export type ImportRow = { row: number; firstName: string; lastName: string; className: string };
export type ImportIssue = { row: number; message: string };

const HEADERS = { vorname: "Vorname", nachname: "Nachname", klasse: "Klasse" } as const;

/** Zellwert als getrimmten String lesen (Zahl, Rich Text, Formelergebnis). */
function cellString(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && !(v instanceof Date) && "result" in v) {
    const res = (v as { result?: unknown }).result;
    if (res === null || res === undefined) return "";
    if (res instanceof Date) return String(cell.text ?? "").trim();
    // Fehlerwerte ({ error: "#N/A" }) und andere Objekte nicht als Text übernehmen
    if (typeof res === "object") return "";
    return String(res).trim();
  }
  return String(cell.text ?? "").trim();
}

export async function parseStudentWorkbook(
  data: ArrayBuffer,
): Promise<{ rows: ImportRow[]; errors: ImportIssue[] }> {
  const fail = (message: string) => ({ rows: [], errors: [{ row: 0, message }] });

  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(data);
  } catch {
    return fail("Die Datei konnte nicht als Excel-Datei (.xlsx) gelesen werden.");
  }
  const ws = wb.worksheets[0];
  if (!ws) return fail("Die Datei enthält kein Tabellenblatt.");

  // Kopfzeile (Zeile 1) auswerten
  const cols: Partial<Record<keyof typeof HEADERS, number>> = {};
  ws.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const key = cellString(cell).toLowerCase() as keyof typeof HEADERS;
    if (key in HEADERS && cols[key] === undefined) cols[key] = colNumber;
  });
  const missing = (Object.keys(HEADERS) as (keyof typeof HEADERS)[]).filter((k) => cols[k] === undefined);
  if (missing.length > 0) {
    return {
      rows: [],
      errors: missing.map((k) => ({ row: 1, message: `Spalte "${HEADERS[k]}" fehlt in der Kopfzeile.` })),
    };
  }

  const rows: ImportRow[] = [];
  const errors: ImportIssue[] = [];
  let dataRows = 0;
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const firstName = cellString(row.getCell(cols.vorname!));
    const lastName = cellString(row.getCell(cols.nachname!));
    const className = cellString(row.getCell(cols.klasse!));
    if (!firstName && !lastName && !className) continue;

    dataRows++;
    if (dataRows > MAX_IMPORT_ROWS) {
      return { rows: [], errors: [{ row: r, message: `Die Datei enthält mehr als ${MAX_IMPORT_ROWS} Datenzeilen.` }] };
    }
    if (!firstName) errors.push({ row: r, message: "Vorname fehlt." });
    else if (firstName.length > 100) errors.push({ row: r, message: "Vorname ist zu lang (max. 100 Zeichen)." });
    else if (firstName.includes(".")) errors.push({ row: r, message: "Vorname darf keinen Punkt enthalten." });
    if (!lastName) errors.push({ row: r, message: "Nachname fehlt." });
    else if (lastName.length > 100) errors.push({ row: r, message: "Nachname ist zu lang (max. 100 Zeichen)." });
    else if (lastName.includes(".")) errors.push({ row: r, message: "Nachname darf keinen Punkt enthalten." });
    rows.push({ row: r, firstName, lastName, className });
  }

  if (errors.length > 0) return { rows: [], errors };
  return { rows, errors };
}

export function planImport(
  rows: ImportRow[],
  classes: { id: string; name: string }[],
  existing: { firstName: string; lastName: string; schoolClassId: string }[],
): {
  toCreate: { row: number; firstName: string; lastName: string; schoolClassId: string }[];
  skipped: ImportIssue[];
  errors: ImportIssue[];
} {
  const key = (f: string, l: string, c: string) => `${c}\u0000${f.trim().toLowerCase()}\u0000${l.trim().toLowerCase()}`;
  const classByName = new Map(classes.map((c) => [c.name.trim().toLowerCase(), c.id]));
  const seen = new Set(existing.map((e) => key(e.firstName, e.lastName, e.schoolClassId)));

  const toCreate: { row: number; firstName: string; lastName: string; schoolClassId: string }[] = [];
  const skipped: ImportIssue[] = [];
  const errors: ImportIssue[] = [];

  for (const r of rows) {
    const schoolClassId = classByName.get(r.className.trim().toLowerCase());
    if (!schoolClassId) {
      errors.push({ row: r.row, message: `Klasse "${r.className}" existiert nicht.` });
      continue;
    }
    const k = key(r.firstName, r.lastName, schoolClassId);
    if (seen.has(k)) {
      skipped.push({ row: r.row, message: `${r.firstName} ${r.lastName} (${r.className}) existiert bereits.` });
      continue;
    }
    seen.add(k);
    toCreate.push({ row: r.row, firstName: r.firstName, lastName: r.lastName, schoolClassId });
  }
  return { toCreate, skipped, errors };
}
