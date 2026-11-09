import type { Prisma } from "@prisma/client";
import { compactRanks } from "@/lib/ranks";

/** Abstand für die Zwischenränge in Phase 1 (deutlich über jedem realen Rang). */
const RANK_OFFSET = 10000;

/**
 * Löscht ungültige Prioritäten im Bereich `scope` und nummeriert die übrigen
 * pro (Schüler, Projekttag) lückenlos 1..n durch (Reihenfolge bleibt erhalten).
 *
 * Ungültig ist eine Priorität, wenn ihr Projekt die Klasse des Schülers ausschließt
 * oder ihr Projekttag die Klasse des Schülers nicht (mehr) enthält.
 *
 * Muss innerhalb der Transaktion der auslösenden Änderung aufgerufen werden.
 */
export async function pruneInvalidPreferences(
  tx: Prisma.TransactionClient,
  scope: { projectDayId?: string; studentIds?: string[] },
): Promise<void> {
  if (scope.studentIds && scope.studentIds.length === 0) return;

  const prefs = await tx.preference.findMany({
    where: {
      ...(scope.projectDayId ? { projectDayId: scope.projectDayId } : {}),
      ...(scope.studentIds ? { studentId: { in: scope.studentIds } } : {}),
    },
    select: {
      id: true,
      rank: true,
      studentId: true,
      projectDayId: true,
      projectId: true,
      student: { select: { schoolClassId: true } },
    },
  });
  if (prefs.length === 0) return;

  const projectIds = [...new Set(prefs.map((p) => p.projectId))];
  const dayIds = [...new Set(prefs.map((p) => p.projectDayId))];
  const [projects, days] = await Promise.all([
    tx.project.findMany({ where: { id: { in: projectIds } }, select: { id: true, excludedClasses: { select: { id: true } } } }),
    tx.projectDay.findMany({ where: { id: { in: dayIds } }, select: { id: true, schoolClasses: { select: { id: true } } } }),
  ]);
  const excludedByProject = new Map(projects.map((p) => [p.id, new Set(p.excludedClasses.map((c) => c.id))]));
  const classesByDay = new Map(days.map((d) => [d.id, new Set(d.schoolClasses.map((c) => c.id))]));

  const isValid = (p: (typeof prefs)[number]) =>
    !excludedByProject.get(p.projectId)?.has(p.student.schoolClassId) &&
    (classesByDay.get(p.projectDayId)?.has(p.student.schoolClassId) ?? false);

  const invalidIds = prefs.filter((p) => !isValid(p)).map((p) => p.id);
  if (invalidIds.length > 0) await tx.preference.deleteMany({ where: { id: { in: invalidIds } } });

  // Verbleibende Prioritäten pro (Schüler, Projekttag) gruppieren und verdichten
  const groups = new Map<string, { id: string; rank: number }[]>();
  for (const p of prefs) {
    if (!isValid(p)) continue;
    const key = `${p.studentId}\u0000${p.projectDayId}`;
    const list = groups.get(key) ?? [];
    list.push({ id: p.id, rank: p.rank });
    groups.set(key, list);
  }
  const changes = [...groups.values()].flatMap((list) => compactRanks(list));
  if (changes.length === 0) return;

  // Zwei Phasen wegen @@unique([studentId, projectDayId, rank]):
  // erst alle betroffenen aus dem Weg räumen, dann auf den Zielrang setzen.
  for (const c of changes) {
    await tx.preference.update({ where: { id: c.id }, data: { rank: c.from + RANK_OFFSET } });
  }
  for (const c of changes) {
    await tx.preference.update({ where: { id: c.id }, data: { rank: c.to } });
  }
}
