import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, parseBody, requireRole, type IdParams } from "@/lib/api";
import { projectAccessFilter } from "@/lib/access";
import { projectDaySchema } from "@/lib/validation";
import {
  assertImageUsable,
  findProjectDay,
  projectDaySelect,
  projectSelect,
  serializeProject,
  serializeProjectDay,
} from "@/lib/projects";
import { assertSchoolClassesExist } from "@/lib/schoolClasses";
import { pruneInvalidPreferences, TX_OPTIONS } from "@/lib/preferencesMaintenance";

/** Projekttag mit den Projekten, die der Nutzer sehen darf (Lehrer: nur eigene). */
export const GET = handle<IdParams>(async (_req, { params }) => {
  const session = await requireRole("SUPERUSER", "TEACHER");
  const day = await findProjectDay((await params).id);
  const projects = await prisma.project.findMany({
    where: { projectDayId: day.id, ...projectAccessFilter(session.user) },
    select: projectSelect,
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ ...serializeProjectDay(day), projects: projects.map(serializeProject) });
});

/** Vollständige Aktualisierung (alle Pflichtfelder wie beim Anlegen); `bannerImage` fehlt = unverändert. */
export const PATCH = handle<IdParams>(async (req, { params }) => {
  await requireRole("SUPERUSER");
  const day = await findProjectDay((await params).id);
  const data = await parseBody(req, projectDaySchema);

  await assertSchoolClassesExist(prisma, data.schoolClassIds);
  const imageChanged = data.bannerImage !== undefined && data.bannerImage !== day.imageId;
  if (imageChanged && data.bannerImage) await assertImageUsable(data.bannerImage, { projectDayId: day.id });

  const keep = new Set(data.schoolClassIds);
  const removedClassIds = day.schoolClasses.map((c) => c.id).filter((id) => !keep.has(id));

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.projectDay.update({
      where: { id: day.id },
      data: {
        name: data.name,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
        enrollmentDeadline: data.enrollmentDeadline,
        ...(imageChanged ? { imageId: data.bannerImage } : {}),
        schoolClasses: { set: data.schoolClassIds.map((id) => ({ id })) },
      },
      select: projectDaySelect,
    });

    if (removedClassIds.length > 0) {
      // Entfernte Klassen auch aus den Ausschlüssen aller Projekte dieses Tags entfernen
      const affected = await tx.project.findMany({
        where: { projectDayId: day.id, excludedClasses: { some: { id: { in: removedClassIds } } } },
        select: { id: true },
      });
      for (const p of affected) {
        await tx.project.update({
          where: { id: p.id },
          data: { excludedClasses: { disconnect: removedClassIds.map((id) => ({ id })) } },
        });
      }
    }
    await pruneInvalidPreferences(tx, { projectDayId: day.id });

    if (imageChanged && day.imageId) await tx.image.delete({ where: { id: day.imageId } });
    return result;
  }, TX_OPTIONS);

  return NextResponse.json(serializeProjectDay(updated));
});

export const DELETE = handle<IdParams>(async (_req, { params }) => {
  await requireRole("SUPERUSER");
  const day = await findProjectDay((await params).id);

  const projectImageIds = (
    await prisma.project.findMany({ where: { projectDayId: day.id, imageId: { not: null } }, select: { imageId: true } })
  ).map((p) => p.imageId!);
  const imageIds = [...projectImageIds, ...(day.imageId ? [day.imageId] : [])];

  // Projekte, Prioritäten und Zuteilungen werden per Cascade gelöscht
  await prisma.$transaction([
    prisma.projectDay.delete({ where: { id: day.id } }),
    prisma.image.deleteMany({ where: { id: { in: imageIds } } }),
  ]);
  return NextResponse.json({ success: true });
});
