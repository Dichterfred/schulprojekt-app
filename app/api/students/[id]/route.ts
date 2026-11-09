import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, handle, notFound, parseBody, requireRole, type IdParams } from "@/lib/api";
import { studentUpdateSchema } from "@/lib/validation";
import { buildUsernameBase, withNumberSuffix } from "@/lib/username";
import { assertSchoolClassesExist } from "@/lib/schoolClasses";
import { pruneInvalidPreferences, TX_OPTIONS } from "@/lib/preferencesMaintenance";
import { requireUsernameBase, studentListSelect, takenUsernames } from "@/lib/students";

/**
 * Ändert Vorname, Nachname und/oder Klasse.
 * Namensänderung → Anmeldename neu; Klassenwechsel → alte Sessions ungültig, ungültige Prioritäten weg.
 */
export const PATCH = handle<IdParams>(async (req, { params }) => {
  await requireRole("SUPERUSER");
  const id = (await params).id;
  const data = await parseBody(req, studentUpdateSchema);

  const current = await prisma.student.findUnique({
    where: { id },
    select: { id: true, firstName: true, lastName: true, username: true, schoolClassId: true },
  });
  if (!current) throw notFound("Schüler nicht gefunden.");

  const firstName = data.firstName ?? current.firstName;
  const lastName = data.lastName ?? current.lastName;
  const schoolClassId = data.schoolClassId ?? current.schoolClassId;
  const classChanged = schoolClassId !== current.schoolClassId;
  const nameChanged = firstName !== current.firstName || lastName !== current.lastName;

  const base = requireUsernameBase(firstName, lastName);
  // Nur neu vergeben, wenn sich die Basis wirklich ändert (z. B. nicht bei reiner Groß-/Kleinschreibung)
  const usernameChanged = base !== buildUsernameBase(current.firstName, current.lastName);

  if (classChanged) await assertSchoolClassesExist(prisma, [schoolClassId]);
  if (nameChanged || classChanged) {
    const duplicate = await prisma.student.findFirst({
      where: {
        id: { not: id },
        schoolClassId,
        firstName: { equals: firstName, mode: "insensitive" },
        lastName: { equals: lastName, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (duplicate) throw new ApiError(409, "Ein Schüler mit diesem Namen existiert in dieser Klasse bereits.");
  }

  const student = await prisma.$transaction(async (tx) => {
    let username: string | undefined;
    if (usernameChanged) {
      const taken = await takenUsernames(tx, base);
      taken.delete(current.username);
      username = withNumberSuffix(base, taken);
    }
    const result = await tx.student.update({
      where: { id },
      data: {
        firstName,
        lastName,
        schoolClassId,
        ...(username ? { username } : {}),
        ...(classChanged ? { sessionVersion: { increment: 1 } } : {}),
      },
      select: studentListSelect,
    });
    if (classChanged) await pruneInvalidPreferences(tx, { studentIds: [id] });
    return result;
  }, TX_OPTIONS);
  return NextResponse.json(student);
});

/** Löscht den Schüler samt Prioritäten und Zuteilungen (Cascade). */
export const DELETE = handle<IdParams>(async (_req, { params }) => {
  await requireRole("SUPERUSER");
  await prisma.student.delete({ where: { id: (await params).id } });
  return NextResponse.json({ success: true });
});
