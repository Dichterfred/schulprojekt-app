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

export const projectSchema = z
  .object({
    name,
    description,
    studentCount: positiveInt("Schüleranzahl"),
    schoolClassIds: z.array(z.string().min(1)).min(1, "Es muss mindestens eine Schulklasse ausgewählt werden."),
    startDate: date("Start"),
    endDate: date("Ende"),
    enrollmentDeadline: date("Einschreibefrist"),
    bannerImage,
    assignedOwnerId: z.string().min(1).nullable().optional(),
  })
  .refine((p) => p.endDate >= p.startDate, { message: "Das Ende darf nicht vor dem Start liegen.", path: ["endDate"] })
  .refine((p) => p.enrollmentDeadline <= p.endDate, {
    message: "Die Einschreibefrist darf nicht nach dem Projektende liegen.",
    path: ["enrollmentDeadline"],
  });

export const groupSchema = z.object({
  name,
  description,
  maxStudents: positiveInt("Maximale Schüleranzahl"),
  bannerImage,
});

export const groupCreateSchema = groupSchema.extend({ projectId: z.string().min(1, "projectId erforderlich.") });

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

export const enrollmentCreateSchema = z.object({ studentId: z.string().min(1) });

export const priorityRankSchema = z.object({
  groupId: z.string().min(1),
  priority: z.number().int("Priorität muss eine ganze Zahl sein.").min(1),
});

/**
 * Zerlegt die Login-Eingabe "vorname.nachname" am letzten Punkt.
 * Leerzeichen bleiben erhalten (Doppelnamen), Groß-/Kleinschreibung wird ignoriert.
 */
export function parseStudentLogin(fullname: string): { firstName: string; lastName: string } | null {
  const value = fullname.trim().toLowerCase();
  const dot = value.lastIndexOf(".");
  if (dot <= 0 || dot === value.length - 1) return null;
  const firstName = value.slice(0, dot).trim();
  const lastName = value.slice(dot + 1).trim();
  if (!firstName || !lastName) return null;
  return { firstName, lastName };
}
