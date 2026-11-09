import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
import { slugifyProjectName, withSuffix } from "@/lib/projectCode";

describe("slugifyProjectName", () => {
  it("wandelt Namen in Großbuchstaben mit Bindestrichen um", () => {
    expect(slugifyProjectName("Projektwoche 2026")).toBe("PROJEKTWOCHE-2026");
  });

  it("ersetzt Umlaute und ß", () => {
    expect(slugifyProjectName("Grüße & Öl")).toBe("GRUESSE-OEL");
  });

  it("entfernt Akzente und Sonderzeichen am Rand", () => {
    expect(slugifyProjectName("  Café!! ")).toBe("CAFE");
  });

  it("kürzt an Wortgrenzen statt mitten im Wort", () => {
    expect(slugifyProjectName("Projektwoche Natur 2026")).toBe("PROJEKTWOCHE-NATUR");
  });

  it("kürzt auf 20 Zeichen ohne Bindestrich am Ende", () => {
    const code = slugifyProjectName("Sehr langer Projektname mit vielen Wörtern");
    expect(code.length).toBeLessThanOrEqual(20);
    expect(code.endsWith("-")).toBe(false);
  });

  it("liefert einen Fallback bei leerem Ergebnis", () => {
    expect(slugifyProjectName("!!!")).toBe("PROJEKT");
  });
});

describe("withSuffix", () => {
  it("lässt den ersten Code unverändert", () => {
    expect(withSuffix("THEATER", 1)).toBe("THEATER");
  });

  it("hängt ab dem zweiten Code eine Nummer an", () => {
    expect(withSuffix("THEATER", 2)).toBe("THEATER-2");
  });

  it("hält die Maximallänge auch mit Suffix ein", () => {
    expect(withSuffix("ABCDEFGHIJKLMNOPQRST", 12)).toBe("ABCDEFGHIJKLMNOPQ-12");
    expect(withSuffix("PROJEKTWOCHE-NATUR", 2)).toBe("PROJEKTWOCHE-NATUR-2");
    expect(withSuffix("PROJEKTWOCHE-NATUR", 10)).toBe("PROJEKTWOCHE-10");
  });
});
