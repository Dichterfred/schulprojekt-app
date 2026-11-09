import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, handle, requireRole } from "@/lib/api";
import { MAX_IMPORT_BYTES, parseStudentWorkbook, planImport, type ImportIssue } from "@/lib/studentImport";
import { createStudentCredentials } from "@/lib/studentPassword";
import { assignUsernames, buildUsernameBase } from "@/lib/username";
import { requirePasswordKey, takenUsernames } from "@/lib/students";

const errorResponse = (errors: ImportIssue[]) =>
  NextResponse.json({ error: "Der Import enthält Fehler. Es wurde nichts angelegt.", errors }, { status: 400 });

/** Excel-Import (ganz oder gar nicht). Antwort: Anzahl, übersprungene Duplikate, IDs der neuen Schüler. */
export const POST = handle(async (req) => {
  await requireRole("SUPERUSER");

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw badRequest("Ungültige Formulardaten.");
  }
  const file = form.get("file");
  if (!(file instanceof File)) throw badRequest("Keine Datei übermittelt.");
  if (!file.name.toLowerCase().endsWith(".xlsx")) throw badRequest("Nur Excel-Dateien (.xlsx) sind erlaubt.");
  if (file.size > MAX_IMPORT_BYTES) {
    throw badRequest(`Die Datei ist zu groß (max. ${MAX_IMPORT_BYTES / 1024 / 1024} MB).`);
  }

  const parsed = await parseStudentWorkbook(await file.arrayBuffer());
  if (parsed.errors.length > 0) return errorResponse(parsed.errors);

  const [classes, existing] = await Promise.all([
    prisma.schoolClass.findMany({ select: { id: true, name: true } }),
    prisma.student.findMany({ select: { firstName: true, lastName: true, schoolClassId: true } }),
  ]);
  const plan = planImport(parsed.rows, classes, existing);
  const errors = [
    ...plan.errors,
    ...plan.toCreate
      .filter((s) => !buildUsernameBase(s.firstName, s.lastName))
      .map((s) => ({ row: s.row, message: "Name enthält keine gültigen Buchstaben." })),
  ].sort((a, b) => a.row - b.row);
  if (errors.length > 0) return errorResponse(errors);

  // Credentials vor der Transaktion erzeugen (bcrypt ist langsam, die Transaktion soll kurz bleiben)
  const credentials: Awaited<ReturnType<typeof createStudentCredentials>>[] = [];
  if (plan.toCreate.length > 0) {
    const key = requirePasswordKey();
    for (let i = 0; i < plan.toCreate.length; i++) credentials.push(await createStudentCredentials(key));
  }

  const created = await prisma.$transaction(
    async (tx) => {
      const withNames = assignUsernames(plan.toCreate, await takenUsernames(tx));
      return tx.student.createManyAndReturn({
        data: withNames.map((s, i) => ({
          firstName: s.firstName,
          lastName: s.lastName,
          schoolClassId: s.schoolClassId,
          username: s.username,
          passwordHash: credentials[i].passwordHash,
          passwordEncrypted: credentials[i].passwordEncrypted,
        })),
        select: { id: true },
      });
    },
    { timeout: 30_000 },
  );

  return NextResponse.json({
    created: created.length,
    skipped: plan.skipped,
    studentIds: created.map((s) => s.id),
  });
});
