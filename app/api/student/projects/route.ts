import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle } from "@/lib/api";
import { studentVisibleProjectsWhere } from "@/lib/access";
import { requireStudent } from "@/lib/studentSession";
import { imageUrl } from "@/lib/validation";

export const GET = handle(async () => {
  const { studentId, schoolClassId, projectDay } = await requireStudent();

  const [day, projects, preferences] = await Promise.all([
    prisma.projectDay.findUniqueOrThrow({
      where: { id: projectDay.id },
      select: { id: true, name: true, description: true, imageId: true, enrollmentDeadline: true },
    }),
    prisma.project.findMany({
      where: studentVisibleProjectsWhere(projectDay.id, schoolClassId),
      select: { id: true, name: true, description: true, imageId: true, maxStudents: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.preference.findMany({
      where: { studentId, projectDayId: projectDay.id },
      select: { projectId: true, rank: true },
    }),
  ]);

  const rankByProject = new Map(preferences.map((p) => [p.projectId, p.rank]));

  return NextResponse.json({
    projectDay: {
      id: day.id,
      name: day.name,
      description: day.description,
      bannerImage: imageUrl(day.imageId),
      enrollmentDeadline: day.enrollmentDeadline,
    },
    deadlinePassed: new Date() > day.enrollmentDeadline,
    projects: projects.map(({ imageId, ...p }) => ({
      ...p,
      bannerImage: imageUrl(imageId),
      priority: rankByProject.get(p.id) ?? null,
    })),
  });
});
