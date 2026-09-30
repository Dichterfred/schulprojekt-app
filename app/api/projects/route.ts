import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateUniqueProjectCode } from "@/lib/generateCode";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "STUDENT") {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const where = session.user.role === "SUPERUSER" ? {} : { ownerId: session.user.id };

  const projects = await prisma.project.findMany({
    where,
    include: { groups: true, schoolClasses: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "STUDENT") {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const body = await req.json();
  const { name, description, studentCount, schoolClassIds, startDate, endDate, enrollmentDeadline, bannerImage, assignedOwnerId } = body;

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

  // Owner-Logik:
  // - SUPERUSER + assignedOwnerId → Projekt wird dem gewählten Lehrer zugeordnet
  // - SUPERUSER ohne assignedOwnerId → kein Owner (null)
  // - TEACHER → immer sich selbst, assignedOwnerId wird ignoriert
  let ownerConnect: { connect: { id: string } } | undefined = undefined;

  if (session.user.role === "SUPERUSER") {
    if (assignedOwnerId) {
      const teacher = await prisma.user.findFirst({ where: { id: assignedOwnerId, role: "TEACHER" } });
      if (!teacher) {
        return NextResponse.json({ error: "Gewählter Lehrer nicht gefunden." }, { status: 400 });
      }
      ownerConnect = { connect: { id: assignedOwnerId } };
    }
    // kein assignedOwnerId → ownerConnect bleibt undefined → ownerId wird null
  } else {
    // TEACHER: immer eigene ID
    ownerConnect = { connect: { id: session.user.id } };
  }

  const code = await generateUniqueProjectCode();

  const project = await prisma.project.create({
    data: {
      name,
      description,
      studentCount: Number(studentCount),
      ...(ownerConnect ? { owner: ownerConnect } : {}),
      code,
      startDate: start,
      endDate: end,
      enrollmentDeadline: deadline,
      bannerImage: bannerImage ?? null,
      schoolClasses: { connect: schoolClassIds.map((id: string) => ({ id })) },
    },
    include: { groups: true, schoolClasses: true },
  });

  return NextResponse.json(project, { status: 201 });
}
