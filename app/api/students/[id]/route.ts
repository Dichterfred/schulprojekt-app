import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, requireRole, type IdParams } from "@/lib/api";

export const DELETE = handle<IdParams>(async (_req, { params }) => {
  await requireRole("SUPERUSER");
  await prisma.student.delete({ where: { id: (await params).id } });
  return NextResponse.json({ success: true });
});
