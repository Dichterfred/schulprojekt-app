import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, handle, parseBody, requireRole } from "@/lib/api";
import { groupCreateSchema } from "@/lib/validation";
import { assertImageUsable, findAccessibleProject, groupSelect, serializeGroup } from "@/lib/projects";

export const GET = handle(async (req) => {
  const session = await requireRole("SUPERUSER", "TEACHER");
  const projectId = new URL(req.url).searchParams.get("projectId");
  if (!projectId) throw badRequest("projectId erforderlich.");

  const project = await findAccessibleProject(session, projectId);
  const groups = await prisma.group.findMany({
    where: { projectId: project.id },
    select: groupSelect,
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(groups.map(serializeGroup));
});

export const POST = handle(async (req) => {
  const session = await requireRole("SUPERUSER", "TEACHER");
  const data = await parseBody(req, groupCreateSchema);
  const project = await findAccessibleProject(session, data.projectId);

  const allocated = project.groups.reduce((sum, g) => sum + g.maxStudents, 0);
  if (allocated + data.maxStudents > project.studentCount) {
    throw badRequest(
      `Die maximale Schüleranzahl würde überschritten. Noch verfügbare Plätze: ${project.studentCount - allocated}.`
    );
  }
  if (data.bannerImage) await assertImageUsable(data.bannerImage, {});

  const group = await prisma.group.create({
    data: {
      name: data.name,
      description: data.description,
      maxStudents: data.maxStudents,
      projectId: project.id,
      imageId: data.bannerImage ?? null,
    },
    select: groupSelect,
  });
  return NextResponse.json(serializeGroup(group), { status: 201 });
});
