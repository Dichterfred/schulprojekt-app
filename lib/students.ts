import type { Prisma } from "@prisma/client";
import { ApiError, badRequest } from "@/lib/api";
import { loadPasswordKey } from "@/lib/studentPassword";
import { buildUsernameBase } from "@/lib/username";

/** Felder für Schülerlisten – niemals Passwortfelder. */
export const studentListSelect = {
  id: true,
  firstName: true,
  lastName: true,
  username: true,
  createdAt: true,
  schoolClassId: true,
  schoolClass: { select: { id: true, name: true, sortOrder: true } },
} satisfies Prisma.StudentSelect;

/** Sortierung: Klasse (sortOrder), Nachname, Vorname. */
export const studentOrderBy = [
  { schoolClass: { sortOrder: "asc" } },
  { lastName: "asc" },
  { firstName: "asc" },
] satisfies Prisma.StudentOrderByWithRelationInput[];

/**
 * Bereits vergebene Anmeldenamen (für die Eindeutigkeit neuer Namen).
 * Mit `prefix` werden nur passende Namen geladen (reicht für einen einzelnen Schüler).
 */
export async function takenUsernames(tx: Prisma.TransactionClient, prefix?: string): Promise<Set<string>> {
  const rows = await tx.student.findMany({
    where: prefix ? { username: { startsWith: prefix } } : undefined,
    select: { username: true },
  });
  return new Set(rows.map((r) => r.username));
}

/** Basis des Anmeldenamens – 400, wenn der Name keine verwertbaren Buchstaben enthält. */
export function requireUsernameBase(firstName: string, lastName: string): string {
  const base = buildUsernameBase(firstName, lastName);
  if (!base) throw badRequest("Name enthält keine gültigen Buchstaben.");
  return base;
}

/** Schlüssel für die Passwort-Verschlüsselung – klare Fehlermeldung statt generischem 500er. */
export function requirePasswordKey(): Buffer {
  try {
    return loadPasswordKey();
  } catch (err) {
    throw new ApiError(500, `Server nicht konfiguriert: ${(err as Error).message}`);
  }
}

/** Antwort-Header für Antworten mit Klartext-Passwörtern. */
export const NO_STORE = { "Cache-Control": "no-store" } as const;
