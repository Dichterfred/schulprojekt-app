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
  { title: "Nachname", width: 95 },
  { title: "Vorname", width: 85 },
  { title: "Anmeldename", width: 210 },
  { title: "Passwort", width: PAGE_W - 2 * MARGIN - 390 },
];
const MIN_SIZE = 6;
const LINE_H = 10;

// Passt den Text in die Breite: erst Schrift bis minSize verkleinern, sonst in Zeilen umbrechen (nichts geht verloren)
export function fitText(
  text: string,
  font: PDFFont,
  maxWidth: number,
  size: number,
  minSize: number,
): { lines: string[]; size: number } {
  let s = size;
  while (font.widthOfTextAtSize(text, s) > maxWidth && s - 0.5 >= minSize) s -= 0.5;
  if (font.widthOfTextAtSize(text, s) <= maxWidth) return { lines: [text], size: s };
  const lines: string[] = [];
  let cur = "";
  for (const ch of Array.from(text)) {
    if (cur !== "" && font.widthOfTextAtSize(cur + ch, s) > maxWidth) {
      lines.push(cur);
      cur = ch;
    } else {
      cur += ch;
    }
  }
  if (cur !== "") lines.push(cur);
  return { lines, size: s };
}

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
  // Namen: erst Schrift verkleinern, unter der Mindestgröße mit "…" kürzen
  const drawCell = (page: PDFPage, i: number, text: string, y: number, size: number) => {
    const maxW = COLS[i].width - COL_GAP;
    const f = fitText(text, font, maxW, size, MIN_SIZE);
    const out = f.lines.length > 1 ? fit(text, font, MIN_SIZE, maxW) : f.lines[0];
    const outSize = f.lines.length > 1 ? MIN_SIZE : f.size;
    page.drawText(out, { x: cellX(i), y, size: outSize, font, color: black });
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
      // Anmeldename und Passwort nie abschneiden: Schrift verkleinern, sonst umbrechen
      const user = fitText(s.username, font, COLS[2].width - COL_GAP, 11, MIN_SIZE);
      const pass = fitText(s.password, font, COLS[3].width - COL_GAP, 14, MIN_SIZE);
      const extraLines = Math.max(user.lines.length, pass.lines.length, 1) - 1;
      const rowH = ROW_H + extraLines * LINE_H;
      if (y - rowH < FOOTER_Y + 20) {
        page = newPage(`${title} (Fortsetzung)`);
        y = TOP_Y - 50 - ROW_H;
      }
      drawCell(page, 0, s.lastName, y, 11);
      drawCell(page, 1, s.firstName, y, 11);
      user.lines.forEach((l, k) =>
        page.drawText(l, { x: cellX(2), y: y - k * LINE_H, size: user.size, font, color: black }),
      );
      pass.lines.forEach((l, k) =>
        page.drawText(l, { x: cellX(3), y: y - 1 - k * LINE_H, size: pass.size, font, color: black }),
      );
      // gestrichelte Trennlinie zum Ausschneiden
      const lineY = y - 12 - extraLines * LINE_H;
      page.drawLine({
        start: { x: MARGIN, y: lineY },
        end: { x: PAGE_W - MARGIN, y: lineY },
        thickness: 0.5,
        color: grey,
        dashArray: [4, 3],
      });
      y -= rowH;
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

