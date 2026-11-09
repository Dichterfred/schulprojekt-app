import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, handle, parseBody, requireRole } from "@/lib/api";
import { invalidExcludedClassIds, projectAccessFilter } from "@/lib/access";
import { projectCreateSchema } from "@/lib/validation";
import {
  assertImageUsable,
  EXCLUDED_CLASSES_ERROR,
  findProjectDay,
  projectSelect,
  serializeProject,
} from "@/lib/projects";

/** Projekte eines Projekttags (`?projectDayId=`); Lehrer sehen nur eigene. */
export const GET = handle(async (req) => {
  const session = await requireRole("SUPERUSER", "TEACHER");
  const projectDayId = new URL(req.url).searchParams.get("projectDayId");
  if (!projectDayId) throw badRequest("projectDayId erforderlich.");

  const day = await findProjectDay(projectDayId);
  const projects = await prisma.project.findMany({
    where: { projectDayId: day.id, ...projectAccessFilter(session.user) },
    select: projectSelect,
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(projects.map(serializeProject));
});

export const POST = handle(async (req) => {
  const session = await requireRole("SUPERUSER", "TEACHER");
  const data = await parseBody(req, projectCreateSchema);
  const day = await findProjectDay(data.projectDayId);

  // Owner: Lehrer immer selbst; Superuser optional einem Lehrer zuordnen.
  let ownerId: string | null = session.user.id;
  if (session.user.role === "SUPERUSER") {
    ownerId = null;
    if (data.assignedOwnerId) {
      const teacher = await prisma.user.findFirst({ where: { id: data.assignedOwnerId, role: "TEACHER" } });
      if (!teacher) throw badRequest("Gewählter Lehrer nicht gefunden.");
      ownerId = teacher.id;
    }
  }

  const excluded = [...new Set(data.excludedClassIds)];
  if (invalidExcludedClassIds(excluded, day.schoolClasses.map((c) => c.id)).length > 0) {
    throw badRequest(EXCLUDED_CLASSES_ERROR);
  }
  if (data.bannerImage) await assertImageUsable(data.bannerImage, {});

  const project = await prisma.project.create({
    data: {
      name: data.name,
      description: data.description,
      maxStudents: data.maxStudents,
      projectDayId: day.id,
      imageId: data.bannerImage ?? null,
      ownerId,
      excludedClasses: { connect: excluded.map((id) => ({ id })) },
    },
    select: projectSelect,
  });
  return NextResponse.json(serializeProject(project), { status: 201 });
});
