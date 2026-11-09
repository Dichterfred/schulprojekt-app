import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, requireRole, type IdParams } from "@/lib/api";
import { findAccessibleEnrollment } from "../_access";

export const DELETE = handle<IdParams>(async (_req, { params }) => {
  const session = await requireRole("SUPERUSER", "TEACHER");
  const enrollment = await findAccessibleEnrollment(session, (await params).id);
  await prisma.enrollment.delete({ where: { id: enrollment.id } });
  return NextResponse.json({ success: true });
});
