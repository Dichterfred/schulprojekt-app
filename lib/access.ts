import type { Prisma } from "@prisma/client";

export type SessionUser = { id: string; role: "SUPERUSER" | "TEACHER" | "STUDENT" };

// Nur Superuser dürfen Projekttage verwalten.
export function canManageProjectDays(user: SessionUser): boolean {
  return user.role === "SUPERUSER";
}

// Superuser sehen alle Projekte, alle anderen nur eigene.
export function projectAccessFilter(user: SessionUser): Prisma.ProjectWhereInput {
  return user.role === "SUPERUSER" ? {} : { ownerId: user.id };
}

// Projekte eines Tages, die für die Klasse der Schülerin/des Schülers nicht ausgeschlossen sind.
export function studentVisibleProjectsWhere(
  projectDayId: string,
  schoolClassId: string,
): Prisma.ProjectWhereInput {
  return { projectDayId, excludedClasses: { none: { id: schoolClassId } } };
}

// Ausgeschlossene Klassen-Ids, die nicht zu den Klassen des Tages gehören.
export function invalidExcludedClassIds(excludedIds: string[], dayClassIds: string[]): string[] {
  const allowed = new Set(dayClassIds);
  return excludedIds.filter((id) => !allowed.has(id));
}

// Schüler-Session gilt nur bei gleicher Version und Klasse, die am Tag teilnimmt.
export function isStudentSessionValid(
  student: { sessionVersion: number; schoolClassId: string } | null,
  tokenVersion: number,
  dayClassIds: string[],
): boolean {
  if (!student) return false;
  if (student.sessionVersion !== tokenVersion) return false;
  return dayClassIds.includes(student.schoolClassId);
}
