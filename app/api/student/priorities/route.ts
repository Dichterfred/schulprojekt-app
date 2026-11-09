import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, badRequest, handle, notFound, parseBody } from "@/lib/api";
import { studentVisibleProjectsWhere } from "@/lib/access";
import { requireStudent, type StudentContext } from "@/lib/studentSession";
import { priorityRankSchema } from "@/lib/validation";

/** Prüft die Frist des Projekttags anhand der Serverzeit. */
function assertDeadlineOpen(ctx: StudentContext) {
  if (new Date() > ctx.projectDay.enrollmentDeadline) {
    throw new ApiError(403, "Die Einschreibefrist für diesen Projekttag ist bereits abgelaufen.");
  }
}

async function prioritiesOf(studentId: string, projectDayId: string) {
  const preferences = await prisma.preference.findMany({ where: { studentId, projectDayId } });
  return Object.fromEntries(preferences.map((p) => [p.projectId, p.rank]));
}

export const POST = handle(async (req) => {
  const ctx = await requireStudent();
  const { projectId, priority } = await parseBody(req, priorityRankSchema);
  assertDeadlineOpen(ctx);

  const { studentId, schoolClassId } = ctx;
  // projectDayId stammt immer aus der Session, nie aus dem Request.
  const projectDayId = ctx.projectDay.id;
  const visible = await prisma.project.findMany({
    where: studentVisibleProjectsWhere(projectDayId, schoolClassId),
    select: { id: true },
  });
  if (!visible.some((p) => p.id === projectId)) throw notFound("Dieses Projekt ist für dich nicht verfügbar.");
  if (priority > visible.length) throw badRequest(`Die Priorität darf höchstens ${visible.length} betragen.`);

  // Ist die Priorität schon an ein anderes Projekt vergeben, "wandert" sie zum neu gewählten Projekt.
  await prisma.$transaction([
    prisma.preference.deleteMany({ where: { studentId, projectDayId, rank: priority, projectId: { not: projectId } } }),
    prisma.preference.upsert({
      where: { studentId_projectId: { studentId, projectId } },
      update: { rank: priority },
      create: { studentId, projectDayId, projectId, rank: priority },
    }),
  ]);

  return NextResponse.json({ priorities: await prioritiesOf(studentId, projectDayId) });
});

export const DELETE = handle(async (req) => {
  const ctx = await requireStudent();
  const projectId = new URL(req.url).searchParams.get("projectId");
  if (!projectId) throw badRequest("projectId erforderlich.");
  assertDeadlineOpen(ctx);

  await prisma.preference.deleteMany({ where: { studentId: ctx.studentId, projectDayId: ctx.projectDay.id, projectId } });
  return NextResponse.json({ success: true });
});
