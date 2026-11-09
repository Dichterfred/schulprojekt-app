import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { parseStudentWorkbook, planImport, MAX_IMPORT_ROWS } from "@/lib/studentImport";

async function build(rows: unknown[][]): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Schüler");
  rows.forEach((r) => ws.addRow(r));
  const buf = await wb.xlsx.writeBuffer();
  const u8 = new Uint8Array(buf as ArrayBuffer);
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
}

describe("parseStudentWorkbook", () => {
  it("erkennt die Kopfzeile in beliebiger Reihenfolge und Schreibweise", async () => {
    const data = await build([["KLASSE", "vorname", "Nachname"], ["5a", "Max", "Muster"]]);
    const r = await parseStudentWorkbook(data);
    expect(r.errors).toEqual([]);
    expect(r.rows).toEqual([{ row: 2, firstName: "Max", lastName: "Muster", className: "5a" }]);
  });

  it("meldet fehlende Spalte", async () => {
    const data = await build([["Vorname", "Nachname"], ["Max", "Muster"]]);
    const r = await parseStudentWorkbook(data);
    expect(r.rows).toEqual([]);
    expect(r.errors[0].message).toContain("Spalte");
    expect(r.errors[0].message).toContain("Klasse");
  });

  it("ignoriert komplett leere Zeilen, auch am Ende", async () => {
    const data = await build([
      ["Vorname", "Nachname", "Klasse"],
      ["A", "B", "5a"],
      [null, null, null],
      ["C", "D", "5a"],
      [null, null, null],
    ]);
    const r = await parseStudentWorkbook(data);
    expect(r.errors).toEqual([]);
    expect(r.rows.map((x) => x.row)).toEqual([2, 4]);
  });

  it("liest Zahl, Rich Text und Formelergebnis als String", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("S");
    ws.addRow(["Vorname", "Nachname", "Klasse"]);
    const row = ws.addRow([null, null, 5]);
    row.getCell(1).value = { richText: [{ text: "Ma" }, { text: "x" }] };
    row.getCell(2).value = { formula: "A1", result: "Muster" };
    const buf = await wb.xlsx.writeBuffer();
    const r = await parseStudentWorkbook(buf as ArrayBuffer);
    expect(r.rows).toEqual([{ row: 2, firstName: "Max", lastName: "Muster", className: "5" }]);
  });

  it("übernimmt Formelfehler nicht als Text", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("S");
    ws.addRow(["Vorname", "Nachname", "Klasse"]);
    const row = ws.addRow([null, "Muster", "5a"]);
    row.getCell(1).value = { formula: "NA()", result: { error: "#N/A" } } as ExcelJS.CellFormulaValue;
    const buf = await wb.xlsx.writeBuffer();
    const r = await parseStudentWorkbook(buf as ArrayBuffer);
    expect(r.rows).toEqual([]);
    expect(r.errors[0].row).toBe(2);
    expect(r.errors[0].message).toContain("Vorname");
  });

  it("akzeptiert genau 2000 Datenzeilen", async () => {
    const rows: unknown[][] = [["Vorname", "Nachname", "Klasse"]];
    for (let i = 0; i < MAX_IMPORT_ROWS; i++) rows.push(["A" + i, "B", "5a"]);
    const r = await parseStudentWorkbook(await build(rows));
    expect(r.errors).toEqual([]);
    expect(r.rows.length).toBe(2000);
  });

  it("meldet fehlende Namen und Punkte mit Zeilennummer", async () => {
    const data = await build([
      ["Vorname", "Nachname", "Klasse"],
      ["", "B", "5a"],
      ["A", "", "5a"],
      ["A.", "B", "5a"],
      ["A", "B.C", "5a"],
    ]);
    const r = await parseStudentWorkbook(data);
    expect(r.rows).toEqual([]);
    expect(r.errors.map((e) => e.row)).toEqual([2, 3, 4, 5]);
  });

  it("lehnt mehr als 2000 Datenzeilen ab", async () => {
    const rows: unknown[][] = [["Vorname", "Nachname", "Klasse"]];
    for (let i = 0; i < MAX_IMPORT_ROWS + 1; i++) rows.push(["A" + i, "B", "5a"]);
    const r = await parseStudentWorkbook(await build(rows));
    expect(r.rows).toEqual([]);
    expect(r.errors[0].message).toContain("2000");
  });

  it("gibt bei Nicht-xlsx einen Fehler statt einer Exception", async () => {
    const bytes = new TextEncoder().encode("x");
    const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const r = await parseStudentWorkbook(data);
    expect(r.rows).toEqual([]);
    expect(r.errors.length).toBe(1);
  });
});

describe("planImport", () => {
  const classes = [{ id: "c1", name: "5a" }, { id: "c2", name: "5b" }];
  const row = (n: number, f: string, l: string, c: string) => ({ row: n, firstName: f, lastName: l, className: c });

  it("ordnet Klassen ohne Rücksicht auf Groß-/Kleinschreibung zu", () => {
    const r = planImport([row(2, "A", "B", "5A")], classes, []);
    expect(r.toCreate).toEqual([{ row: 2, firstName: "A", lastName: "B", schoolClassId: "c1" }]);
  });

  it("meldet unbekannte Klasse", () => {
    const r = planImport([row(2, "A", "B", "9z")], classes, []);
    expect(r.toCreate).toEqual([]);
    expect(r.errors[0].row).toBe(2);
    expect(r.errors[0].message).toContain("Klasse");
  });

  it("überspringt Duplikate aus der Datenbank", () => {
    const r = planImport([row(2, "max", "MUSTER", "5a")], classes, [
      { firstName: "Max", lastName: "Muster", schoolClassId: "c1" },
    ]);
    expect(r.toCreate).toEqual([]);
    expect(r.skipped.map((s) => s.row)).toEqual([2]);
  });

  it("überspringt Duplikate innerhalb der Datei (zweite Zeile)", () => {
    const r = planImport([row(2, "A", "B", "5a"), row(3, "a", "b", "5A")], classes, []);
    expect(r.toCreate.map((x) => x.row)).toEqual([2]);
    expect(r.skipped.map((s) => s.row)).toEqual([3]);
  });

  it("erlaubt gleichen Namen in verschiedenen Klassen", () => {
    const r = planImport([row(2, "A", "B", "5a"), row(3, "A", "B", "5b")], classes, []);
    expect(r.toCreate.length).toBe(2);
  });
});
