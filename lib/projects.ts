import type { Prisma } from "@prisma/client";
import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "@/lib/api";
import { projectAccessFilter } from "@/lib/access";
import { imageUrl } from "@/lib/validation";

export const EXCLUDED_CLASSES_ERROR = "Ausgeschlossene Klassen müssen zum Projekttag gehören.";

const classSelect = { select: { id: true, name: true, sortOrder: true }, orderBy: { sortOrder: "asc" } } as const;

/** Felder eines Projekttags für Listen/Detailansichten – bewusst ohne Bilddaten. */
export const projectDaySelect = {
  id: true,
  name: true,
  description: true,
  code: true,
  startDate: true,
  endDate: true,
  enrollmentDeadline: true,
  imageId: true,
  createdAt: true,
  schoolClasses: classSelect,
} satisfies Prisma.ProjectDaySelect;

type ProjectDayRow = Prisma.ProjectDayGetPayload<{ select: typeof projectDaySelect }>;

export function serializeProjectDay({ imageId, ...d }: ProjectDayRow) {
  return { ...d, bannerImage: imageUrl(imageId) };
}

/** Felder eines Projekts inkl. Owner (Anzeige) und ausgeschlossener Klassen. */
export const projectSelect = {
  id: true,
  name: true,
  description: true,
  maxStudents: true,
  imageId: true,
  projectDayId: true,
  ownerId: true,
  createdAt: true,
  owner: { select: { id: true, username: true } },
  excludedClasses: classSelect,
} satisfies Prisma.ProjectSelect;

type ProjectRow = Prisma.ProjectGetPayload<{ select: typeof projectSelect }>;

export function serializeProject({ imageId, ...p }: ProjectRow) {
  return { ...p, bannerImage: imageUrl(imageId) };
}

/** Lädt einen Projekttag (lesbar für alle Lehrer und den Super User) – sonst 404. */
export async function findProjectDay(id: string) {
  const day = await prisma.projectDay.findUnique({ where: { id }, select: projectDaySelect });
  if (!day) throw notFound("Projekttag nicht gefunden.");
  return day;
}

/** Lädt ein Projekt, auf das der Nutzer Zugriff hat (Super User alle, Lehrer eigene) – sonst 404. */
export async function findAccessibleProject(session: Session, id: string) {
  const project = await prisma.project.findFirst({
    where: { id, ...projectAccessFilter(session.user) },
    select: projectSelect,
  });
  if (!project) throw notFound();
  return project;
}

/** Prüft, dass ein Bild existiert und noch keinem anderen Projekttag/Projekt gehört. */
export async function assertImageUsable(imageId: string, owner: { projectDayId?: string; projectId?: string }) {
  const image = await prisma.image.findUnique({
    where: { id: imageId },
    select: { projectDay: { select: { id: true } }, project: { select: { id: true } } },
  });
  if (!image) throw notFound("Bild nicht gefunden.");
  const usedByOtherDay = image.projectDay && image.projectDay.id !== owner.projectDayId;
  const usedByOtherProject = image.project && image.project.id !== owner.projectId;
  if (usedByOtherDay || usedByOtherProject) throw notFound("Bild nicht gefunden.");
}
