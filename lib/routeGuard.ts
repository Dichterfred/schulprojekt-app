export type GuardRole = "SUPERUSER" | "TEACHER" | "STUDENT";

/** Prüft, ob `pathname` genau `base` ist oder darunter liegt (kein Präfix-Treffer wie "/schueler" vs. "/schueler-verwaltung"). */
function isUnder(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

const TEACHER_AREAS = ["/projekttage", "/schueler-verwaltung", "/settings"];
const SUPERUSER_ONLY = ["/schueler-verwaltung", "/settings"];

/** Ziel der Weiterleitung für einen Pfad und eine Rolle (`null` = keine Sitzung) – oder `null`, wenn der Zugriff erlaubt ist. */
export function guardRedirect(pathname: string, role: GuardRole | null): string | null {
  const isStudentArea = isUnder(pathname, "/student");
  const isTeacherArea = TEACHER_AREAS.some((base) => isUnder(pathname, base));
  if (!isStudentArea && !isTeacherArea) return null;

  if (!role) return isStudentArea ? "/schueler" : "/lehrer";

  if (isTeacherArea) {
    if (role === "STUDENT") return "/student";
    if (role !== "SUPERUSER" && SUPERUSER_ONLY.some((base) => isUnder(pathname, base))) return "/projekttage";
    return null;
  }
  return role === "STUDENT" ? null : "/projekttage";
}
