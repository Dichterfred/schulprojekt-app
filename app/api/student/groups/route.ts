import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const student = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      enrolledProject: {
        include: {
          groups: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });

  if (!student || !student.enrolledProject) {
    return NextResponse.json({ error: "Kein Projekt zugewiesen." }, { status: 404 });
  }

  const priorities = await prisma.groupPriority.findMany({
    where: { studentId: student.id, projectId: student.enrolledProject.id },
  });

  const priorityByGroupId: Record<string, number> = {};
  for (const p of priorities) priorityByGroupId[p.groupId] = p.priority;

  // Serverseitige Prüfung: Ist die Einschreibefrist bereits abgelaufen?
  const now = new Date();
  const deadlinePassed = now > student.enrolledProject.enrollmentDeadline;

  return NextResponse.json({
    project: {
      id: student.enrolledProject.id,
      name: student.enrolledProject.name,
      description: student.enrolledProject.description,
      enrollmentDeadline: student.enrolledProject.enrollmentDeadline,
    },
    deadlinePassed,
    groups: student.enrolledProject.groups.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      maxStudents: g.maxStudents,
      priority: priorityByGroupId[g.id] ?? null,
    })),
  });
}
