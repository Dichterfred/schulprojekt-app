import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, handle, parseBody, requireRole, type IdParams } from "@/lib/api";
import { invalidExcludedClassIds } from "@/lib/access";
import { projectUpdateSchema } from "@/lib/validation";
import {
  assertImageUsable,
  EXCLUDED_CLASSES_ERROR,
  findAccessibleProject,
  findProjectDay,
  projectSelect,
  serializeProject,
} from "@/lib/projects";
import { pruneInvalidPreferences, TX_OPTIONS } from "@/lib/preferencesMaintenance";

export const GET = handle<IdParams>(async (_req, { params }) => {
  const session = await requireRole("SUPERUSER", "TEACHER");
  const project = await findAccessibleProject(session, (await params).id);
  return NextResponse.json(serializeProject(project));
});

/** Teilweise Aktualisierung: fehlende Felder bleiben unverändert. */
export const PATCH = handle<IdParams>(async (req, { params }) => {
  const session = await requireRole("SUPERUSER", "TEACHER");
  const project = await findAccessibleProject(session, (await params).id);
  const data = await parseBody(req, projectUpdateSchema);

  // Owner ändern darf nur der Super User; bei Lehrern wird das Feld ignoriert.
  let ownerId: string | null | undefined;
  if (session.user.role === "SUPERUSER" && data.assignedOwnerId !== undefined) {
    ownerId = null;
    if (data.assignedOwnerId) {
      const teacher = await prisma.user.findFirst({ where: { id: data.assignedOwnerId, role: "TEACHER" } });
      if (!teacher) throw badRequest("Gewählter Lehrer nicht gefunden.");
      ownerId = teacher.id;
    }
  }

  let excluded: string[] | undefined;
  let excludedChanged = false;
  if (data.excludedClassIds !== undefined) {
    excluded = [...new Set(data.excludedClassIds)];
    const day = await findProjectDay(project.projectDayId);
    if (invalidExcludedClassIds(excluded, day.schoolClasses.map((c) => c.id)).length > 0) {
      throw badRequest(EXCLUDED_CLASSES_ERROR);
    }
    const before = new Set(project.excludedClasses.map((c) => c.id));
    excludedChanged = excluded.length !== before.size || excluded.some((id) => !before.has(id));
  }

  const imageChanged = data.bannerImage !== undefined && data.bannerImage !== project.imageId;
  if (imageChanged && data.bannerImage) await assertImageUsable(data.bannerImage, { projectId: project.id });

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.project.update({
      where: { id: project.id },
      data: {
        name: data.name,
        description: data.description,
        maxStudents: data.maxStudents,
        ...(ownerId !== undefined ? { ownerId } : {}),
        ...(imageChanged ? { imageId: data.bannerImage } : {}),
        ...(excludedChanged && excluded ? { excludedClasses: { set: excluded.map((id) => ({ id })) } } : {}),
      },
      select: projectSelect,
    });
    if (excludedChanged) await pruneInvalidPreferences(tx, { projectDayId: project.projectDayId });
    if (imageChanged && project.imageId) await tx.image.delete({ where: { id: project.imageId } });
    return result;
  }, TX_OPTIONS);

  return NextResponse.json(serializeProject(updated));
});

export const DELETE = handle<IdParams>(async (_req, { params }) => {
  const session = await requireRole("SUPERUSER", "TEACHER");
  const project = await findAccessibleProject(session, (await params).id);

  await prisma.$transaction(async (tx) => {
    // Prioritäten und Zuteilungen des Projekts werden per Cascade gelöscht
    await tx.project.delete({ where: { id: project.id } });
    if (project.imageId) await tx.image.delete({ where: { id: project.imageId } });
    // Übrige Ränge der betroffenen Schüler lückenlos verdichten
    await pruneInvalidPreferences(tx, { projectDayId: project.projectDayId });
  }, TX_OPTIONS);
  return NextResponse.json({ success: true });
});
