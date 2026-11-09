import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { ApiError, badRequest, handle, notFound, parseBody, requireRole } from "@/lib/api";
import { priorityRankSchema } from "@/lib/validation";

/** Lädt die Einschreibung des angemeldeten Schülers und prüft die Frist anhand der Serverzeit. */
async function openEnrollment(session: Session) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: session.user.enrollmentId ?? "" },
    select: { id: true, project: { select: { enrollmentDeadline: true, groups: { select: { id: true } } } } },
  });
  if (!enrollment) throw notFound("Kein Projekt zugewiesen.");
  if (new Date() > enrollment.project.enrollmentDeadline) {
    throw new ApiError(403, "Die Einschreibefrist für dieses Projekt ist bereits abgelaufen.");
  }
  return enrollment;
}

async function prioritiesOf(enrollmentId: string) {
  const preferences = await prisma.preference.findMany({ where: { enrollmentId } });
  return Object.fromEntries(preferences.map((p) => [p.groupId, p.rank]));
}

export const POST = handle(async (req) => {
  const session = await requireRole("STUDENT");
  const { groupId, priority } = await parseBody(req, priorityRankSchema);
  const enrollment = await openEnrollment(session);

  const groups = enrollment.project.groups;
  if (!groups.some((g) => g.id === groupId)) throw notFound("Diese Gruppe gehört nicht zu deinem Projekt.");
  if (priority > groups.length) throw badRequest(`Die Priorität darf höchstens ${groups.length} betragen.`);

  // Ist die Priorität schon an eine andere Gruppe vergeben, "wandert" sie zur neu gewählten Gruppe.
  await prisma.$transaction([
    prisma.preference.deleteMany({ where: { enrollmentId: enrollment.id, rank: priority, groupId: { not: groupId } } }),
    prisma.preference.upsert({
      where: { enrollmentId_groupId: { enrollmentId: enrollment.id, groupId } },
      update: { rank: priority },
      create: { enrollmentId: enrollment.id, groupId, rank: priority },
    }),
  ]);

  return NextResponse.json({ priorities: await prioritiesOf(enrollment.id) });
});

export const DELETE = handle(async (req) => {
  const session = await requireRole("STUDENT");
  const groupId = new URL(req.url).searchParams.get("groupId");
  if (!groupId) throw badRequest("groupId erforderlich.");
  const enrollment = await openEnrollment(session);

  await prisma.preference.deleteMany({ where: { enrollmentId: enrollment.id, groupId } });
  return NextResponse.json({ success: true });
});
