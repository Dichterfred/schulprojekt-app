import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, handle, parseBody, requireRole } from "@/lib/api";
import { studentCreateSchema } from "@/lib/validation";
import { createStudentCredentials } from "@/lib/studentPassword";
import { assignUsernames } from "@/lib/username";
import { assertSchoolClassesExist } from "@/lib/schoolClasses";
import {
  NO_STORE,
  requirePasswordKey,
  requireUsernameBase,
  studentListSelect,
  studentOrderBy,
  takenUsernames,
} from "@/lib/students";

/** Schülerliste (ohne Passwortfelder), optional `?classId=`. */
export const GET = handle(async (req) => {
  await requireRole("SUPERUSER");
  const classId = new URL(req.url).searchParams.get("classId");
  const students = await prisma.student.findMany({
    where: classId ? { schoolClassId: classId } : undefined,
    select: studentListSelect,
    orderBy: studentOrderBy,
  });
  return NextResponse.json(students);
});

/** Legt einen Schüler an; das Passwort steht nur in dieser Antwort im Klartext. */
export const POST = handle(async (req) => {
  await requireRole("SUPERUSER");
  const data = await parseBody(req, studentCreateSchema);
  const base = requireUsernameBase(data.firstName, data.lastName);
  await assertSchoolClassesExist(prisma, [data.schoolClassId]);

  const duplicate = await prisma.student.findFirst({
    where: {
      schoolClassId: data.schoolClassId,
      firstName: { equals: data.firstName, mode: "insensitive" },
      lastName: { equals: data.lastName, mode: "insensitive" },
    },
    select: { id: true },
  });
  if (duplicate) throw new ApiError(409, "Ein Schüler mit diesem Namen existiert in dieser Klasse bereits.");

  const { password, passwordHash, passwordEncrypted } = await createStudentCredentials(requirePasswordKey());

  const student = await prisma.$transaction(async (tx) => {
    const [{ username }] = assignUsernames([data], await takenUsernames(tx, base));
    return tx.student.create({
      data: { ...data, username, passwordHash, passwordEncrypted },
      select: studentListSelect,
    });
  });
  return NextResponse.json({ ...student, password }, { status: 201, headers: NO_STORE });
});
