import type { Prisma } from "@prisma/client";
import { badRequest } from "@/lib/api";

/** Prüft, dass alle Klassen-IDs existieren – sonst 400. */
export async function assertSchoolClassesExist(tx: Prisma.TransactionClient, ids: string[]): Promise<void> {
  const unique = [...new Set(ids)];
  const count = await tx.schoolClass.count({ where: { id: { in: unique } } });
  if (count !== unique.length) throw badRequest("Mindestens eine ausgewählte Klasse existiert nicht.");
}
