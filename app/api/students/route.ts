import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPERUSER") {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    select: {
      id: true, firstName: true, lastName: true, createdAt: true,
      enrolledProjectId: true,
      enrolledProject: { select: { id: true, name: true, code: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(students);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPERUSER") {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const body = await req.json();
  const { firstName, lastName, projectId } = body;

  if (!firstName || !lastName || !projectId) {
    return NextResponse.json({ error: "Vorname, Nachname und Projekt sind erforderlich." }, { status: 400 });
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return NextResponse.json({ error: "Projekt nicht gefunden." }, { status: 404 });

  const existing = await prisma.user.findFirst({
    where: {
      role: "STUDENT", enrolledProjectId: projectId,
      firstName: { equals: firstName.trim() }, lastName: { equals: lastName.trim() },
    },
  });
  if (existing) {
    return NextResponse.json({ error: "Ein Schüler mit diesem Namen ist bereits in diesem Projekt angemeldet." }, { status: 400 });
  }

  const student = await prisma.user.create({
    data: { firstName: firstName.trim(), lastName: lastName.trim(), role: "STUDENT", enrolledProjectId: projectId },
    select: {
      id: true, firstName: true, lastName: true, createdAt: true,
      enrolledProjectId: true,
      enrolledProject: { select: { id: true, name: true, code: true } },
    },
  });

  return NextResponse.json(student, { status: 201 });
}
