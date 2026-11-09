import { prisma } from "@/lib/prisma";
import { ApiError, handle, notFound, parseBody, requireRole } from "@/lib/api";
import { studentsPdfRequestSchema } from "@/lib/validation";
import { decryptPassword } from "@/lib/studentPassword";
import { credentialsPdfFileName, groupByClass, renderCredentialsPdf } from "@/lib/studentsPdf";
import { requirePasswordKey, studentOrderBy } from "@/lib/students";
import type { Prisma } from "@prisma/client";

/** PDF mit Zugangsdaten: eine Klasse (`classId`), frisch importierte (`studentIds`) oder alle (`{}`). */
export const POST = handle(async (req) => {
  await requireRole("SUPERUSER");
  const body = await parseBody(req, studentsPdfRequestSchema);

  let where: Prisma.StudentWhereInput = {};
  let label = "alle";
  if ("classId" in body) {
    const schoolClass = await prisma.schoolClass.findUnique({ where: { id: body.classId }, select: { name: true } });
    if (!schoolClass) throw notFound("Klasse nicht gefunden.");
    where = { schoolClassId: body.classId };
    label = schoolClass.name;
  } else if ("studentIds" in body) {
    where = { id: { in: body.studentIds } };
    label = "neu";
  }

  const students = await prisma.student.findMany({
    where,
    select: {
      firstName: true,
      lastName: true,
      username: true,
      passwordEncrypted: true,
      schoolClass: { select: { name: true } },
    },
    orderBy: studentOrderBy,
  });
  if (students.length === 0) throw notFound("Keine Schüler für den Export gefunden.");

  const key = requirePasswordKey();
  let rows;
  try {
    rows = students.map((s) => ({
      className: s.schoolClass.name,
      firstName: s.firstName,
      lastName: s.lastName,
      username: s.username,
      password: decryptPassword(s.passwordEncrypted, key),
    }));
  } catch {
    throw new ApiError(
      500,
      "Gespeicherte Passwörter konnten nicht entschlüsselt werden. Ist STUDENT_PASSWORD_KEY korrekt?",
    );
  }

  let pdf: Uint8Array;
  try {
    pdf = await renderCredentialsPdf(groupByClass(rows));
  } catch (err) {
    throw new ApiError(500, `PDF konnte nicht erzeugt werden: ${(err as Error).message}`);
  }

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${credentialsPdfFileName(label)}"`,
      "Cache-Control": "no-store",
    },
  });
});
