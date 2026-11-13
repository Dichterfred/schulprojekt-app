import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, notFound, requireRole, type IdParams } from "@/lib/api";
import { createStudentCredentials } from "@/lib/studentPassword";
import { NO_STORE, requirePasswordKey } from "@/lib/students";

/** Erzeugt ein neues Passwort (einmalig im Klartext) und macht alte Sessions ungültig. */
export const POST = handle<IdParams>(async (_req, { params }) => {
  await requireRole("SUPERUSER");
  const id = (await params).id;
  const exists = await prisma.student.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw notFound("Schüler nicht gefunden.");

  const { password, passwordHash, passwordEncrypted } = await createStudentCredentials(requirePasswordKey());
  const { username } = await prisma.student.update({
    where: { id },
    data: { passwordHash, passwordEncrypted, sessionVersion: { increment: 1 } },
    select: { username: true },
  });
  return NextResponse.json({ username, password }, { headers: NO_STORE });
});
