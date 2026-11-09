import { prisma } from "@/lib/prisma";

const MAX_LENGTH = 20;

const UMLAUTS: Record<string, string> = { Ä: "AE", Ö: "OE", Ü: "UE", ẞ: "SS", ß: "SS" };

/**
 * Erzeugt aus einem Projektnamen einen lesbaren Code,
 * z. B. "Projektwoche Natur 2026" → "PROJEKTWOCHE-NATUR-2026".
 */
export function slugifyProjectName(name: string): string {
  const upper = name.toUpperCase().replace(/[ÄÖÜẞß]/g, (c) => UMLAUTS[c] ?? c);
  const ascii = upper.normalize("NFKD").replace(/[̀-ͯ]/g, "");
  const full = ascii.replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return truncateAtWord(full, MAX_LENGTH) || "PROJEKT";
}

/** Kürzt an einer Wortgrenze ("-"), damit keine abgeschnittenen Wörter/Jahreszahlen entstehen. */
function truncateAtWord(slug: string, max: number): string {
  if (slug.length <= max) return slug;
  const cut = slug.slice(0, max);
  if (slug[max] === "-") return cut;
  const lastDash = cut.lastIndexOf("-");
  return (lastDash > 0 ? cut.slice(0, lastDash) : cut).replace(/-+$/g, "");
}

/** Hängt bei Kollision "-2", "-3", … an und hält dabei die Maximallänge ein. */
export function withSuffix(base: string, n: number): string {
  if (n <= 1) return base;
  const suffix = `-${n}`;
  return truncateAtWord(base, MAX_LENGTH - suffix.length) + suffix;
}

export async function generateUniqueProjectCode(name: string): Promise<string> {
  const base = slugifyProjectName(name);
  for (let n = 1; ; n++) {
    const candidate = withSuffix(base, n);
    if (!(await prisma.project.findUnique({ where: { code: candidate }, select: { id: true } }))) return candidate;
  }
}
