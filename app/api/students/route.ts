import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, handle, parseBody, requireRole } from "@/lib/api";
import { studentCreateSchema } from "@/lib/validation";

const studentSelect = {
  id: true,
  firstName: true,
  lastName: true,
  createdAt: true,
  schoolClass: { select: { id: true, name: true } },
  enrollments: {
    select: { id: true, project: { select: { id: true, name: true, code: true } } },
    orderBy: { createdAt: "asc" },
  },
} as const;

export const GET = handle(async () => {
  await requireRole("SUPERUSER");
  const students = await prisma.student.findMany({
    select: studentSelect,
    orderBy: [{ schoolClass: { sortOrder: "asc" } }, { lastName: "asc" }, { firstName: "asc" }],
  });
  return NextResponse.json(students);
});

export const POST = handle(async (req) => {
  await requireRole("SUPERUSER");
  const data = await parseBody(req, studentCreateSchema);

  const duplicate = await prisma.student.findFirst({
    where: {
      schoolClassId: data.schoolClassId,
      firstName: { equals: data.firstName, mode: "insensitive" },
      lastName: { equals: data.lastName, mode: "insensitive" },
    },
  });
  if (duplicate) throw new ApiError(409, "Ein Schüler mit diesem Namen existiert in dieser Klasse bereits.");

  const student = await prisma.student.create({ data, select: studentSelect });
  return NextResponse.json(student, { status: 201 });
});
