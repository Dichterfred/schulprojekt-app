import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const body = await req.json();
  const { groupId, priority } = body;

  if (!groupId || !priority || priority < 1) {
    return NextResponse.json({ error: "Ungültige Eingabedaten." }, { status: 400 });
  }

  const student = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { enrolledProject: { include: { groups: true } } },
  });

  if (!student || !student.enrolledProject) {
    return NextResponse.json({ error: "Kein Projekt zugewiesen." }, { status: 404 });
  }

  // WICHTIG: Die Einschreibefrist wird serverseitig anhand der Serverzeit geprüft,
  // damit eine manipulierte Systemzeit auf dem Client keinen Effekt hat.
  const now = new Date();
  if (now > student.enrolledProject.enrollmentDeadline) {
    return NextResponse.json({ error: "Die Einschreibefrist für dieses Projekt ist bereits abgelaufen." }, { status: 403 });
  }

  const group = student.enrolledProject.groups.find((g) => g.id === groupId);
  if (!group) {
    return NextResponse.json({ error: "Diese Gruppe gehört nicht zu deinem Projekt." }, { status: 404 });
  }

  const groupCount = student.enrolledProject.groups.length;
  if (priority > groupCount) {
    return NextResponse.json(
      { error: `Die Priorität darf höchstens ${groupCount} betragen.` },
      { status: 400 }
    );
  }

  // Falls diese Priorität bereits einer anderen Gruppe zugewiesen wurde, wird sie dort entfernt
  // (die Priorität "wandert" zur neu ausgewählten Gruppe).
  await prisma.$transaction([
    prisma.groupPriority.deleteMany({
      where: { studentId: student.id, priority: Number(priority), groupId: { not: groupId } },
    }),
    prisma.groupPriority.upsert({
      where: { studentId_groupId: { studentId: student.id, groupId } },
      update: { priority: Number(priority) },
      create: {
        studentId: student.id,
        projectId: student.enrolledProject.id,
        groupId,
        priority: Number(priority),
      },
    }),
  ]);

  const updatedPriorities = await prisma.groupPriority.findMany({
    where: { studentId: student.id, projectId: student.enrolledProject.id },
  });

  const priorityByGroupId: Record<string, number> = {};
  for (const p of updatedPriorities) priorityByGroupId[p.groupId] = p.priority;

  return NextResponse.json({ priorities: priorityByGroupId });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");
  if (!groupId) return NextResponse.json({ error: "groupId erforderlich." }, { status: 400 });

  const student = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { enrolledProject: true },
  });

  if (!student || !student.enrolledProject) {
    return NextResponse.json({ error: "Kein Projekt zugewiesen." }, { status: 404 });
  }

  const now = new Date();
  if (now > student.enrolledProject.enrollmentDeadline) {
    return NextResponse.json({ error: "Die Einschreibefrist für dieses Projekt ist bereits abgelaufen." }, { status: 403 });
  }

  await prisma.groupPriority.deleteMany({ where: { studentId: student.id, groupId } });

  return NextResponse.json({ success: true });
}
