import type { Prisma } from "@prisma/client";
import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "@/lib/api";
import { imageUrl } from "@/lib/validation";

/** Felder, die Listen/Detailansichten brauchen – bewusst ohne Bilddaten. */
export const projectSelect = {
  id: true,
  name: true,
  description: true,
  studentCount: true,
  code: true,
  startDate: true,
  endDate: true,
  enrollmentDeadline: true,
  imageId: true,
  ownerId: true,
  createdAt: true,
  schoolClasses: { select: { id: true, name: true, sortOrder: true }, orderBy: { sortOrder: "asc" } },
  groups: { select: { id: true, name: true, maxStudents: true }, orderBy: { createdAt: "asc" } },
  _count: { select: { enrollments: true } },
} satisfies Prisma.ProjectSelect;

type ProjectRow = Prisma.ProjectGetPayload<{ select: typeof projectSelect }>;

export function serializeProject({ imageId, _count, ...p }: ProjectRow) {
  return { ...p, bannerImage: imageUrl(imageId), enrolledCount: _count.enrollments };
}

export const groupSelect = {
  id: true,
  name: true,
  description: true,
  maxStudents: true,
  imageId: true,
  projectId: true,
  createdAt: true,
} satisfies Prisma.GroupSelect;

type GroupRow = Prisma.GroupGetPayload<{ select: typeof groupSelect }>;

export function serializeGroup({ imageId, ...g }: GroupRow) {
  return { ...g, bannerImage: imageUrl(imageId) };
}

/** Superuser dürfen alles, Lehrer nur eigene Projekte. */
export function projectAccessFilter(session: Session): Prisma.ProjectWhereInput {
  return session.user.role === "SUPERUSER" ? {} : { ownerId: session.user.id };
}

/** Lädt ein Projekt, auf das der Nutzer Zugriff hat – sonst 404. */
export async function findAccessibleProject(session: Session, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...projectAccessFilter(session) },
    select: projectSelect,
  });
  if (!project) throw notFound();
  return project;
}

/** Prüft, dass ein Bild existiert und noch keinem anderen Projekt/keiner anderen Gruppe gehört. */
export async function assertImageUsable(imageId: string, owner: { projectId?: string; groupId?: string }) {
  const image = await prisma.image.findUnique({
    where: { id: imageId },
    select: { project: { select: { id: true } }, group: { select: { id: true } } },
  });
  if (!image) throw notFound("Bild nicht gefunden.");
  const usedByOtherProject = image.project && image.project.id !== owner.projectId;
  const usedByOtherGroup = image.group && image.group.id !== owner.groupId;
  if (usedByOtherProject || usedByOtherGroup) throw notFound("Bild nicht gefunden.");
}
