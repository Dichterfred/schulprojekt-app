import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, requireRole, type IdParams } from "@/lib/api";
import { generatePin, hashPin } from "@/lib/pin";
import { findAccessibleEnrollment } from "../../_access";

/** Erzeugt eine neue PIN (die alte wird ungültig) und gibt sie einmalig zurück. */
export const POST = handle<IdParams>(async (_req, { params }) => {
  const session = await requireRole("SUPERUSER", "TEACHER");
  const enrollment = await findAccessibleEnrollment(session, (await params).id);
  const pin = generatePin();
  await prisma.enrollment.update({ where: { id: enrollment.id }, data: { pinHash: await hashPin(pin) } });
  return NextResponse.json({ pin, projectCode: enrollment.project.code });
});
