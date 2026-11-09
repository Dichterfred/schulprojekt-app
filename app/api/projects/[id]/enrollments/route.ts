import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, badRequest, handle, notFound, parseBody, requireRole, type IdParams } from "@/lib/api";
import { enrollmentCreateSchema } from "@/lib/validation";
import { findAccessibleProject } from "@/lib/projects";
import { generatePin, hashPin } from "@/lib/pin";

/** Eingeschriebene Schüler eines Projekts (ohne PINs – die gibt es nur beim Erzeugen). */
export const GET = handle<IdParams>(async (_req, { params }) => {
  const session = await requireRole("SUPERUSER", "TEACHER");
  const project = await findAccessibleProject(session, (await params).id);
  const enrollments = await prisma.enrollment.findMany({
    where: { projectId: project.id },
    select: {
      id: true,
      createdAt: true,
      student: { select: { id: true, firstName: true, lastName: true, schoolClass: { select: { name: true } } } },
    },
    orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
  });
  return NextResponse.json(enrollments);
});

/** Schreibt einen Schüler ein und gibt die PIN einmalig im Klartext zurück. */
export const POST = handle<IdParams>(async (req, { params }) => {
  const session = await requireRole("SUPERUSER", "TEACHER");
  const project = await findAccessibleProject(session, (await params).id);
  const { studentId } = await parseBody(req, enrollmentCreateSchema);

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw notFound("Schüler nicht gefunden.");
  if (!project.schoolClasses.some((c) => c.id === student.schoolClassId)) {
    throw badRequest("Die Klasse des Schülers ist diesem Projekt nicht zugeordnet.");
  }
  if (project._count.enrollments >= project.studentCount) {
    throw badRequest(`Das Projekt ist voll (${project.studentCount} Schüler).`);
  }
  if (await prisma.enrollment.findUnique({ where: { projectId_studentId: { projectId: project.id, studentId } } })) {
    throw new ApiError(409, "Der Schüler ist bereits in diesem Projekt eingeschrieben.");
  }

  const pin = generatePin();
  const enrollment = await prisma.enrollment.create({
    data: { projectId: project.id, studentId, pinHash: await hashPin(pin) },
    select: { id: true },
  });
  return NextResponse.json({ id: enrollment.id, pin, projectCode: project.code }, { status: 201 });
});
