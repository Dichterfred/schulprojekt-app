import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "@/lib/api";
import { projectAccessFilter } from "@/lib/projects";

export async function findAccessibleEnrollment(session: Session, id: string) {
  const enrollment = await prisma.enrollment.findFirst({
    where: { id, project: projectAccessFilter(session) },
    select: { id: true, project: { select: { code: true } } },
  });
  if (!enrollment) throw notFound("Einschreibung nicht gefunden.");
  return enrollment;
}
