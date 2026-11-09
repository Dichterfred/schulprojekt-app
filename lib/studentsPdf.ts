import { promises as fs } from "fs";
import path from "path";
import { PDFDocument, PDFFont, PDFPage, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

export type CredentialRow = { firstName: string; lastName: string; username: string; password: string };

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 50;
const ROW_H = 34;
const FOOTER_Y = 30;
const TOP_Y = PAGE_H - MARGIN;
const COL_GAP = 8;

// Spaltenbreiten (Summe = Seitenbreite - 2 * Rand)
const COLS = [
  { title: "Nachname", width: 120 },
  { title: "Vorname", width: 110 },
  { title: "Anmeldename", width: 170 },
  { title: "Passwort", width: PAGE_W - 2 * MARGIN - 400 },
];

// Kürzt den Text mit "…" so, dass er in die Breite passt
function fit(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  const chars = Array.from(text);
  while (chars.length > 0 && font.widthOfTextAtSize(chars.join("") + "…", size) > maxWidth) {
    chars.pop();
  }
  return chars.join("") + "…";
}

export async function renderCredentialsPdf(
  classes: { className: string; students: CredentialRow[] }[],
): Promise<Uint8Array> {
  const fontBytes = await fs.readFile(path.join(process.cwd(), "assets/fonts/NotoSans-Regular.ttf"));
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(fontBytes, { subset: true });
  const black = rgb(0, 0, 0);
  const grey = rgb(0.5, 0.5, 0.5);

  const cellX = (i: number) => MARGIN + COLS.slice(0, i).reduce((s, c) => s + c.width, 0);
  const drawCell = (page: PDFPage, i: number, text: string, y: number, size: number) => {
    page.drawText(fit(text, font, size, COLS[i].width - COL_GAP), { x: cellX(i), y, size, font, color: black });
  };

  const newPage = (title: string): PDFPage => {
    const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    page.drawText(fit(title, font, 18, PAGE_W - 2 * MARGIN), { x: MARGIN, y: TOP_Y - 18, size: 18, font, color: black });
    const headY = TOP_Y - 50;
    COLS.forEach((c, i) => page.drawText(c.title, { x: cellX(i), y: headY, size: 10, font, color: grey }));
    return page;
  };

  if (classes.length === 0) {
    const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    page.drawText("Keine Schüler", { x: MARGIN, y: TOP_Y - 18, size: 18, font, color: black });
  }

  for (const cls of classes) {
    const title = `Klasse ${cls.className}`;
    let page = newPage(title);
    let y = TOP_Y - 50 - ROW_H;
    for (const s of cls.students) {
      if (y - ROW_H < FOOTER_Y + 20) {
        page = newPage(`${title} (Fortsetzung)`);
        y = TOP_Y - 50 - ROW_H;
      }
      drawCell(page, 0, s.lastName, y, 11);
      drawCell(page, 1, s.firstName, y, 11);
      drawCell(page, 2, s.username, y, 11);
      drawCell(page, 3, s.password, y - 1, 14);
      // gestrichelte Trennlinie zum Ausschneiden
      page.drawLine({
        start: { x: MARGIN, y: y - 12 },
        end: { x: PAGE_W - MARGIN, y: y - 12 },
        thickness: 0.5,
        color: grey,
        dashArray: [4, 3],
      });
      y -= ROW_H;
    }
  }

  // Fußzeile mit Seitenzahlen
  const pages = pdfDoc.getPages();
  pages.forEach((page, i) => {
    const text = `Seite ${i + 1} / ${pages.length}`;
    const w = font.widthOfTextAtSize(text, 9);
    page.drawText(text, { x: (PAGE_W - w) / 2, y: FOOTER_Y, size: 9, font, color: grey });
  });

  return pdfDoc.save();
}

