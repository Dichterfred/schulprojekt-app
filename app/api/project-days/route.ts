import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, handle, parseBody, requireRole } from "@/lib/api";
import { canManageProjectDays } from "@/lib/access";
import { projectDaySchema } from "@/lib/validation";
import { generateUniqueProjectCode } from "@/lib/projectCode";
import { assertImageUsable, projectDaySelect, serializeProjectDay } from "@/lib/projects";
import { assertSchoolClassesExist } from "@/lib/schoolClasses";

/** Alle Projekttage – lesbar für Lehrer und Super User. */
export const GET = handle(async () => {
  await requireRole("SUPERUSER", "TEACHER");
  const days = await prisma.projectDay.findMany({ select: projectDaySelect, orderBy: { startDate: "desc" } });
  return NextResponse.json(days.map(serializeProjectDay));
});

export const POST = handle(async (req) => {
  const session = await requireRole("SUPERUSER", "TEACHER");
  if (!canManageProjectDays(session.user)) throw new ApiError(403, "Keine Berechtigung.");
  const data = await parseBody(req, projectDaySchema);

  await assertSchoolClassesExist(prisma, data.schoolClassIds);
  if (data.bannerImage) await assertImageUsable(data.bannerImage, {});

  const day = await prisma.projectDay.create({
    data: {
      name: data.name,
      description: data.description,
      code: await generateUniqueProjectCode(data.name),
      startDate: data.startDate,
      endDate: data.endDate,
      enrollmentDeadline: data.enrollmentDeadline,
      imageId: data.bannerImage ?? null,
      schoolClasses: { connect: data.schoolClassIds.map((id) => ({ id })) },
    },
    select: projectDaySelect,
  });
  return NextResponse.json(serializeProjectDay(day), { status: 201 });
});
