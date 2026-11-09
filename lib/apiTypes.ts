// Antwortformen der API (JSON) für die Client-Seiten.

export type SchoolClass = { id: string; name: string; sortOrder: number };

export type Teacher = { id: string; username: string };

export type ProjectDay = {
  id: string;
  name: string;
  description: string;
  code: string;
  startDate: string;
  endDate: string;
  enrollmentDeadline: string;
  bannerImage: string | null;
  createdAt: string;
  schoolClasses: SchoolClass[];
};

export type Project = {
  id: string;
  name: string;
  description: string;
  maxStudents: number;
  bannerImage: string | null;
  projectDayId: string;
  ownerId: string | null;
  createdAt: string;
  owner: Teacher | null;
  excludedClasses: SchoolClass[];
};

export type Me = { id: string; name?: string | null; role: "SUPERUSER" | "TEACHER" | "STUDENT" };

/** Liest die Fehlermeldung aus einer API-Antwort (`{ error }`) oder liefert den Fallback. */
export async function apiError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    return typeof data?.error === "string" && data.error ? data.error : fallback;
  } catch {
    return fallback;
  }
}
