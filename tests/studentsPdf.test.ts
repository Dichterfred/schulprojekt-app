import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { renderCredentialsPdf, type CredentialRow } from "@/lib/studentsPdf";

function rows(n: number): CredentialRow[] {
  return Array.from({ length: n }, (_, i) => ({
    firstName: `Vorname${i}`,
    lastName: `Nachname${i}`,
    username: `vorname${i}.nachname${i}`,
    password: "abcdefghjk",
  }));
}

describe("renderCredentialsPdf", () => {
  it("liefert eine PDF-Datei", async () => {
    const bytes = await renderCredentialsPdf([{ className: "5a", students: rows(2) }]);
    expect(Buffer.from(bytes.slice(0, 5)).toString("latin1")).toBe("%PDF-");
  });

  it("beginnt jede Klasse auf einer neuen Seite", async () => {
    const bytes = await renderCredentialsPdf([
      { className: "5a", students: rows(3) },
      { className: "5b", students: rows(3) },
    ]);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(2);
  });

  it("bricht große Klassen auf mehrere Seiten um", async () => {
    const bytes = await renderCredentialsPdf([{ className: "5a", students: rows(60) }]);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThan(1);
  });

  it("verarbeitet Sonderzeichen und sehr lange Namen", async () => {
    const students: CredentialRow[] = [
      { firstName: "Łukasz", lastName: "Ćorić", username: "lukasz.coric", password: "abcdefghjk" },
      { firstName: "Şahin", lastName: "X".repeat(200), username: "u".repeat(200), password: "abcdefghjk" },
    ];
    const bytes = await renderCredentialsPdf([{ className: "6c", students }]);
    expect(bytes.length).toBeGreaterThan(0);
  });

  it("erzeugt bei leerer Liste eine Seite", async () => {
    const bytes = await renderCredentialsPdf([]);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
  });
});
