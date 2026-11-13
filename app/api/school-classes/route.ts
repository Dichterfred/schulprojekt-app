import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, requireRole } from "@/lib/api";

export const GET = handle(async () => {
  await requireRole("SUPERUSER", "TEACHER");
  const schoolClasses = await prisma.schoolClass.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json(schoolClasses);
});
