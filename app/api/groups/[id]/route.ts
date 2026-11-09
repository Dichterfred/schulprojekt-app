import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { badRequest, handle, notFound, parseBody, requireRole, type IdParams } from "@/lib/api";
import { groupSchema } from "@/lib/validation";
import { assertImageUsable, groupSelect, projectAccessFilter, serializeGroup } from "@/lib/projects";

async function findAccessibleGroup(session: Session, groupId: string) {
  const group = await prisma.group.findFirst({
    where: { id: groupId, project: projectAccessFilter(session) },
    select: {
      ...groupSelect,
      project: { select: { studentCount: true, groups: { select: { id: true, maxStudents: true } } } },
    },
  });
  if (!group) throw notFound();
  return group;
}

export const PUT = handle<IdParams>(async (req, { params }) => {
  const session = await requireRole("SUPERUSER", "TEACHER");
  const group = await findAccessibleGroup(session, (await params).id);
  const data = await parseBody(req, groupSchema);

  const otherGroups = group.project.groups.filter((g) => g.id !== group.id).reduce((sum, g) => sum + g.maxStudents, 0);
  if (otherGroups + data.maxStudents > group.project.studentCount) {
    throw badRequest(
      `Die maximale Schüleranzahl würde überschritten. Noch verfügbare Plätze: ${group.project.studentCount - otherGroups}.`
    );
  }

  const imageChanged = data.bannerImage !== undefined && data.bannerImage !== group.imageId;
  if (imageChanged && data.bannerImage) await assertImageUsable(data.bannerImage, { groupId: group.id });

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.group.update({
      where: { id: group.id },
      data: {
        name: data.name,
        description: data.description,
        maxStudents: data.maxStudents,
        ...(imageChanged ? { imageId: data.bannerImage } : {}),
      },
      select: groupSelect,
    });
    if (imageChanged && group.imageId) await tx.image.delete({ where: { id: group.imageId } });
    return result;
  });
  return NextResponse.json(serializeGroup(updated));
});

export const DELETE = handle<IdParams>(async (_req, { params }) => {
  const session = await requireRole("SUPERUSER", "TEACHER");
  const group = await findAccessibleGroup(session, (await params).id);
  await prisma.$transaction([
    prisma.group.delete({ where: { id: group.id } }),
    prisma.image.deleteMany({ where: { id: group.imageId ?? "" } }),
  ]);
  return NextResponse.json({ success: true });
});
