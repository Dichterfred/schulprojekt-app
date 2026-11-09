import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, notFound, requireRole } from "@/lib/api";
import { imageUrl } from "@/lib/validation";

export const GET = handle(async () => {
  const session = await requireRole("STUDENT");
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: session.user.enrollmentId ?? "" },
    select: {
      preferences: { select: { groupId: true, rank: true } },
      project: {
        select: {
          id: true,
          name: true,
          description: true,
          imageId: true,
          enrollmentDeadline: true,
          groups: {
            select: { id: true, name: true, description: true, imageId: true, maxStudents: true },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });
  if (!enrollment) throw notFound("Kein Projekt zugewiesen.");

  const rankByGroup = new Map(enrollment.preferences.map((p) => [p.groupId, p.rank]));
  const { project } = enrollment;

  return NextResponse.json({
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      bannerImage: imageUrl(project.imageId),
      enrollmentDeadline: project.enrollmentDeadline,
    },
    deadlinePassed: new Date() > project.enrollmentDeadline,
    groups: project.groups.map(({ imageId, ...g }) => ({
      ...g,
      bannerImage: imageUrl(imageId),
      priority: rankByGroup.get(g.id) ?? null,
    })),
  });
});
