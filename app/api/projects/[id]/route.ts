import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, handle, parseBody, requireRole, type IdParams } from "@/lib/api";
import { projectSchema } from "@/lib/validation";
import { assertImageUsable, findAccessibleProject, projectSelect, serializeProject } from "@/lib/projects";

export const GET = handle<IdParams>(async (_req, { params }) => {
  const session = await requireRole("SUPERUSER", "TEACHER");
  const project = await findAccessibleProject(session, (await params).id);
  return NextResponse.json(serializeProject(project));
});

export const PUT = handle<IdParams>(async (req, { params }) => {
  const session = await requireRole("SUPERUSER", "TEACHER");
  const project = await findAccessibleProject(session, (await params).id);
  const data = await parseBody(req, projectSchema);

  const allocated = project.groups.reduce((sum, g) => sum + g.maxStudents, 0);
  if (data.studentCount < allocated) {
    throw badRequest(
      `Die Schüleranzahl darf nicht kleiner sein als die Summe der bereits vergebenen Gruppenplätze (${allocated}).`
    );
  }
  if (data.studentCount < project._count.enrollments) {
    throw badRequest(`Es sind bereits ${project._count.enrollments} Schüler eingeschrieben.`);
  }

  const imageChanged = data.bannerImage !== undefined && data.bannerImage !== project.imageId;
  if (imageChanged && data.bannerImage) await assertImageUsable(data.bannerImage, { projectId: project.id });

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.project.update({
      where: { id: project.id },
      data: {
        name: data.name,
        description: data.description,
        studentCount: data.studentCount,
        startDate: data.startDate,
        endDate: data.endDate,
        enrollmentDeadline: data.enrollmentDeadline,
        ...(imageChanged ? { imageId: data.bannerImage } : {}),
        schoolClasses: { set: data.schoolClassIds.map((id) => ({ id })) },
      },
      select: projectSelect,
    });
    if (imageChanged && project.imageId) await tx.image.delete({ where: { id: project.imageId } });
    return result;
  });

  return NextResponse.json(serializeProject(updated));
});

export const DELETE = handle<IdParams>(async (_req, { params }) => {
  const session = await requireRole("SUPERUSER", "TEACHER");
  const project = await findAccessibleProject(session, (await params).id);

  const groupImageIds = (
    await prisma.group.findMany({ where: { projectId: project.id, imageId: { not: null } }, select: { imageId: true } })
  ).map((g) => g.imageId!);
  const imageIds = [...groupImageIds, ...(project.imageId ? [project.imageId] : [])];

  await prisma.$transaction([
    prisma.project.delete({ where: { id: project.id } }),
    prisma.image.deleteMany({ where: { id: { in: imageIds } } }),
  ]);
  return NextResponse.json({ success: true });
});
