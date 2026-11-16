import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { handle, notFound, parseBody, requireRole, type IdParams } from "@/lib/api";
import { passwordSchema } from "@/lib/validation";

/** Nur Konten mit Rolle TEACHER – Superuser können hierüber nicht gelöscht/geändert werden. */
async function findTeacher(id: string) {
  const teacher = await prisma.user.findFirst({ where: { id, role: "TEACHER" }, select: { id: true } });
  if (!teacher) throw notFound("Lehrer nicht gefunden.");
  return teacher;
}

export const DELETE = handle<IdParams>(async (_req, { params }) => {
  await requireRole("SUPERUSER");
  const teacher = await findTeacher((await params).id);
  await prisma.user.delete({ where: { id: teacher.id } });
  return NextResponse.json({ success: true });
});

export const PATCH = handle<IdParams>(async (req, { params }) => {
  await requireRole("SUPERUSER");
  const teacher = await findTeacher((await params).id);
  const { password } = await parseBody(req, passwordSchema);
  await prisma.user.update({ where: { id: teacher.id }, data: { passwordHash: await bcrypt.hash(password, 10) } });
  return NextResponse.json({ success: true });
});
