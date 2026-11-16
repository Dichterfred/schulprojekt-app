import { z } from "zod";

const IMAGE_URL = /^\/api\/images\/([a-z0-9]+)$/;

/** Bild-URL "/api/images/<id>" → Bild-ID. `null` entfernt das Bild, `undefined` lässt es unverändert. */
const bannerImage = z
  .string()
  .regex(IMAGE_URL, "Ungültiges Bild.")
  .transform((url) => url.match(IMAGE_URL)![1])
  .nullable()
  .optional();

export function imageUrl(imageId: string | null): string | null {
  return imageId ? `/api/images/${imageId}` : null;
}

const name = z.string().trim().min(1, "Name ist erforderlich.").max(200);
const description = z.string().trim().min(1, "Beschreibung ist erforderlich.").max(10000);
const positiveInt = (label: string) =>
  z.coerce.number({ error: `${label} muss eine Zahl sein.` }).int(`${label} muss eine ganze Zahl sein.`).positive(`${label} muss größer als 0 sein.`);
const date = (label: string) => z.coerce.date({ error: `${label}: ungültiges Datum.` });

export const projectDaySchema = z
  .object({
    name,
    description,
    schoolClassIds: z.array(z.string().min(1)).min(1, "Es muss mindestens eine Schulklasse ausgewählt werden."),
    startDate: date("Start"),
    endDate: date("Ende"),
    enrollmentDeadline: date("Einschreibefrist"),
    bannerImage,
  })
  .refine((p) => p.endDate >= p.startDate, { message: "Das Ende darf nicht vor dem Start liegen.", path: ["endDate"] })
  .refine((p) => p.enrollmentDeadline <= p.endDate, {
    message: "Die Einschreibefrist darf nicht nach dem Ende des Projekttags liegen.",
    path: ["enrollmentDeadline"],
  });

const excludedClassIds = z.array(z.string().min(1));

const projectBase = z.object({
  name,
  description,
  maxStudents: positiveInt("Maximale Schüleranzahl"),
  bannerImage,
  excludedClassIds,
  assignedOwnerId: z.string().min(1).nullable().optional(),
});

export const projectSchema = projectBase.extend({ excludedClassIds: excludedClassIds.default([]) });

/** Für PATCH: alles optional und bewusst ohne Defaults – fehlende Felder bleiben unverändert. */
export const projectUpdateSchema = projectBase.partial();

export const projectCreateSchema = projectSchema.extend({ projectDayId: z.string().min(1, "projectDayId erforderlich.") });

export const PASSWORD_MIN_LENGTH = 8;
const password = z
  .string({ error: "Passwort muss ein Text sein." })
  .min(PASSWORD_MIN_LENGTH, `Das Passwort muss mindestens ${PASSWORD_MIN_LENGTH} Zeichen haben.`)
  .max(200);

export const teacherCreateSchema = z.object({
  username: z.string().trim().min(1, "Benutzername ist erforderlich.").max(100),
  password,
});

export const passwordSchema = z.object({ password });

/** Namen dürfen keinen Punkt enthalten, da der Login "vorname.nachname" lautet. */
const personName = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} ist erforderlich.`)
    .max(100)
    .refine((v) => !v.includes("."), `${label} darf keinen Punkt enthalten.`);

export const studentCreateSchema = z.object({
  firstName: personName("Vorname"),
  lastName: personName("Nachname"),
  schoolClassId: z.string().min(1, "Bitte eine Klasse auswählen."),
});

export const studentUpdateSchema = studentCreateSchema.partial();

export const priorityRankSchema = z.object({
  projectId: z.string().min(1),
  priority: z.number().int("Priorität muss eine ganze Zahl sein.").min(1),
});

/** Body für den PDF-Export: eine Klasse, einzelne Schüler-IDs oder alle Klassen (leer). */
export const studentsPdfRequestSchema = z.union([
  z.object({ classId: z.string().min(1) }),
  z.object({ studentIds: z.array(z.string().min(1)).min(1).max(2000) }),
  z.strictObject({}),
]);
