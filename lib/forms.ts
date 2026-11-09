import { endOfDayUTC, startOfDayUTC, toDateOnly, toLocalDateTimeInputValue } from "@/lib/dateHelpers";

type ClassRef = { id: string };

/** Formularwerte eines Projekttags (Datumsfelder im Format der <input>-Elemente). */
export type ProjectDayFormValues = {
  name: string;
  description: string;
  bannerImage: string | null;
  schoolClassIds: string[];
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  enrollmentDeadline: string; // YYYY-MM-DDTHH:mm (lokal)
};

/** Vollständiger Body für POST/PATCH /api/project-days (PATCH verlangt alle Felder). */
export function projectDayFormToBody(f: ProjectDayFormValues) {
  return {
    name: f.name,
    description: f.description,
    bannerImage: f.bannerImage,
    schoolClassIds: f.schoolClassIds,
    startDate: startOfDayUTC(f.startDate),
    endDate: endOfDayUTC(f.endDate),
    enrollmentDeadline: new Date(f.enrollmentDeadline).toISOString(),
  };
}

export function projectDayToForm(d: {
  name: string;
  description: string;
  bannerImage: string | null;
  schoolClasses: ClassRef[];
  startDate: string;
  endDate: string;
  enrollmentDeadline: string;
}): ProjectDayFormValues {
  return {
    name: d.name,
    description: d.description,
    bannerImage: d.bannerImage,
    schoolClassIds: d.schoolClasses.map((c) => c.id),
    startDate: toDateOnly(d.startDate),
    endDate: toDateOnly(d.endDate),
    enrollmentDeadline: toLocalDateTimeInputValue(d.enrollmentDeadline),
  };
}

/** Formularwerte eines Projekts; `assignedOwnerId` "" = keinem Lehrer zugeordnet. */
export type ProjectFormValues = {
  name: string;
  description: string;
  bannerImage: string | null;
  maxStudents: string;
  excludedClassIds: string[];
  assignedOwnerId: string;
};

/** Body für POST/PATCH /api/projects – den Owner sendet nur der Super User. */
export function projectFormToBody(f: ProjectFormValues, isSuperuser: boolean) {
  return {
    name: f.name,
    description: f.description,
    bannerImage: f.bannerImage,
    maxStudents: Number(f.maxStudents),
    excludedClassIds: f.excludedClassIds,
    ...(isSuperuser ? { assignedOwnerId: f.assignedOwnerId || null } : {}),
  };
}

export function projectToForm(p: {
  name: string;
  description: string;
  bannerImage: string | null;
  maxStudents: number;
  ownerId: string | null;
  excludedClasses: ClassRef[];
}): ProjectFormValues {
  return {
    name: p.name,
    description: p.description,
    bannerImage: p.bannerImage,
    maxStudents: String(p.maxStudents),
    excludedClassIds: p.excludedClasses.map((c) => c.id),
    assignedOwnerId: p.ownerId ?? "",
  };
}

/** Anzeige der ausgeschlossenen Klassen auf der Projekt-Karte, z. B. "ohne: 5a, 5b". */
export function excludedClassesLabel(classes: { name: string }[]): string {
  return classes.length > 0 ? `ohne: ${classes.map((c) => c.name).join(", ")}` : "";
}
