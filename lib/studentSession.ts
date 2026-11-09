import { prisma } from "@/lib/prisma";
import { ApiError, requireRole } from "@/lib/api";
import { isStudentSessionValid } from "@/lib/access";

export type StudentContext = {
  studentId: string;
  schoolClassId: string;
  projectDay: { id: string; enrollmentDeadline: Date };
};

const sessionExpired = () => new ApiError(401, "Sitzung abgelaufen. Bitte neu anmelden.");

/**
 * Prüft die Schüler-Session gegen die Datenbank: Schüler existiert, sessionVersion stimmt
 * und die Klasse nimmt noch am Projekttag teil. Sonst 401.
 */
export async function requireStudent(): Promise<StudentContext> {
  const session = await requireRole("STUDENT");
  const { id, projectDayId, sessionVersion } = session.user;
  if (!projectDayId || sessionVersion === undefined) throw sessionExpired();

  const [student, projectDay] = await Promise.all([
    prisma.student.findUnique({ where: { id }, select: { sessionVersion: true, schoolClassId: true } }),
    prisma.projectDay.findUnique({
      where: { id: projectDayId },
      select: { id: true, enrollmentDeadline: true, schoolClasses: { select: { id: true } } },
    }),
  ]);
  if (!student || !projectDay) throw sessionExpired();

  const dayClassIds = projectDay.schoolClasses.map((c) => c.id);
  if (!isStudentSessionValid(student, sessionVersion, dayClassIds)) throw sessionExpired();

  return {
    studentId: id,
    schoolClassId: student.schoolClassId,
    projectDay: { id: projectDay.id, enrollmentDeadline: projectDay.enrollmentDeadline },
  };
}
