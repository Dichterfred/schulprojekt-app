import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkAccess(projectId: string, userId: string, role: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { groups: true, schoolClasses: true },
  });
  if (!project) return { project: null, allowed: false };
  const allowed = role === "SUPERUSER" || project.ownerId === userId;
  return { project, allowed };
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "STUDENT") {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
  const { project, allowed } = await checkAccess(params.id, session.user.id, session.user.role);
  if (!project || !allowed) {
    return NextResponse.json({ error: "Nicht gefunden oder keine Berechtigung." }, { status: 404 });
  }
  return NextResponse.json(project);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "STUDENT") {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { project, allowed } = await checkAccess(params.id, session.user.id, session.user.role);
  if (!project || !allowed) {
    return NextResponse.json({ error: "Nicht gefunden oder keine Berechtigung." }, { status: 404 });
  }

  const body = await req.json();
  const { name, description, studentCount, schoolClassIds, startDate, endDate, enrollmentDeadline } = body;

  if (!name || !description || !studentCount || studentCount <= 0) {
    return NextResponse.json({ error: "Ungültige Eingabedaten." }, { status: 400 });
  }

  if (!Array.isArray(schoolClassIds) || schoolClassIds.length === 0) {
    return NextResponse.json({ error: "Es muss mindestens eine Schulklasse ausgewählt werden." }, { status: 400 });
  }

  if (!startDate || !endDate || !enrollmentDeadline) {
    return NextResponse.json({ error: "Start, Ende und Einschreibefrist sind erforderlich." }, { status: 400 });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const deadline = new Date(enrollmentDeadline);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || isNaN(deadline.getTime())) {
    return NextResponse.json({ error: "Ungültiges Datumsformat." }, { status: 400 });
  }

  if (end < start) {
    return NextResponse.json({ error: "Das Ende darf nicht vor dem Start liegen." }, { status: 400 });
  }

  const currentlyAllocated = project.groups.reduce((sum, g) => sum + g.maxStudents, 0);
  if (Number(studentCount) < currentlyAllocated) {
    return NextResponse.json(
      { error: `Die Schüler Anzahl darf nicht kleiner sein als die Summe der bereits vergebenen Gruppenplätze (${currentlyAllocated}).` },
      { status: 400 }
    );
  }

  const updated = await prisma.project.update({
    where: { id: params.id },
    data: {
      name,
      description,
      studentCount: Number(studentCount),
      startDate: start,
      endDate: end,
      enrollmentDeadline: deadline,
      schoolClasses: { set: schoolClassIds.map((id: string) => ({ id })) },
    },
    include: { groups: true, schoolClasses: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "STUDENT") {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
  const { project, allowed } = await checkAccess(params.id, session.user.id, session.user.role);
  if (!project || !allowed) {
    return NextResponse.json({ error: "Nicht gefunden oder keine Berechtigung." }, { status: 404 });
  }
  await prisma.project.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
