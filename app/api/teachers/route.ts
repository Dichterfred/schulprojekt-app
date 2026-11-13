import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ApiError, handle, parseBody, requireRole } from "@/lib/api";
import { teacherCreateSchema } from "@/lib/validation";

const teacherSelect = { id: true, username: true, createdAt: true } as const;

export const GET = handle(async () => {
  await requireRole("SUPERUSER");
  const teachers = await prisma.user.findMany({
    where: { role: "TEACHER" },
    select: teacherSelect,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(teachers);
});

export const POST = handle(async (req) => {
  await requireRole("SUPERUSER");
  const { username, password } = await parseBody(req, teacherCreateSchema);

  if (await prisma.user.findUnique({ where: { username } })) {
    throw new ApiError(409, "Benutzername ist bereits vergeben.");
  }
  const teacher = await prisma.user.create({
    data: { username, passwordHash: await bcrypt.hash(password, 10), role: "TEACHER" },
    select: teacherSelect,
  });
  return NextResponse.json(teacher, { status: 201 });
});
