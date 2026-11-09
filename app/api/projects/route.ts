import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, handle, parseBody, requireRole } from "@/lib/api";
import { projectSchema } from "@/lib/validation";
import { generateUniqueProjectCode } from "@/lib/projectCode";
import { assertImageUsable, projectAccessFilter, projectSelect, serializeProject } from "@/lib/projects";

export const GET = handle(async () => {
  const session = await requireRole("SUPERUSER", "TEACHER");
  const projects = await prisma.project.findMany({
    where: projectAccessFilter(session),
    select: projectSelect,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(projects.map(serializeProject));
});

export const POST = handle(async (req) => {
  const session = await requireRole("SUPERUSER", "TEACHER");
  const data = await parseBody(req, projectSchema);

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

  if (data.bannerImage) await assertImageUsable(data.bannerImage, {});

  const project = await prisma.project.create({
    data: {
      name: data.name,
      description: data.description,
      studentCount: data.studentCount,
      code: await generateUniqueProjectCode(data.name),
      startDate: data.startDate,
      endDate: data.endDate,
      enrollmentDeadline: data.enrollmentDeadline,
      imageId: data.bannerImage ?? null,
      ownerId,
      schoolClasses: { connect: data.schoolClassIds.map((id) => ({ id })) },
    },
    select: projectSelect,
  });
  return NextResponse.json(serializeProject(project), { status: 201 });
});
