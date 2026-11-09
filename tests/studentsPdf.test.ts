import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { promises as fs } from "fs";
import fontkit from "@pdf-lib/fontkit";
import { fitText, renderCredentialsPdf, type CredentialRow } from "@/lib/studentsPdf";

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

describe("fitText", () => {
  async function loadFont() {
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    return doc.embedFont(await fs.readFile("assets/fonts/NotoSans-Regular.ttf"), { subset: true });
  }

  it("kürzt einen 60 Zeichen langen Anmeldenamen nie", async () => {
    const font = await loadFont();
    const name = "anna-maria.von-berg-ueberlaenge-sehr-langer-doppelname123456";
    expect(name).toHaveLength(60);
    for (const width of [202, 120, 40]) {
      const r = fitText(name, font, width, 11, 6);
      expect(r.lines.join("")).toBe(name);
      expect(r.lines.join("")).not.toContain("…");
      for (const l of r.lines) expect(font.widthOfTextAtSize(l, r.size)).toBeLessThanOrEqual(width);
    }
  });

  it("verkleinert die Schrift, bevor umgebrochen wird", async () => {
    const font = await loadFont();
    const r = fitText("anna-maria.von-berg-ueberlaenge", font, 150, 11, 6);
    expect(r.lines).toHaveLength(1);
    expect(r.size).toBeLessThan(11);
  });

  it("rendert lange Zugangsdaten ohne Fehler", async () => {
    const students: CredentialRow[] = [
      { firstName: "A", lastName: "B", username: "u".repeat(60), password: "abcdefghjk" },
    ];
    const bytes = await renderCredentialsPdf([{ className: "5a", students }]);
    expect(bytes.length).toBeGreaterThan(0);
  });
});
