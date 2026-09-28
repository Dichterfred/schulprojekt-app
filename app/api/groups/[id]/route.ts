import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function loadGroupWithProject(groupId: string) {
  return prisma.group.findUnique({ where: { id: groupId }, include: { project: { include: { groups: true } } } });
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "STUDENT") {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const group = await loadGroupWithProject(params.id);
  if (!group) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });

  const allowed = session.user.role === "SUPERUSER" || group.project.ownerId === session.user.id;
  if (!allowed) return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });

  const body = await req.json();
  const { name, description, maxStudents } = body;

  if (!name || !description || !maxStudents || maxStudents <= 0) {
    return NextResponse.json({ error: "Ungültige Eingabedaten." }, { status: 400 });
  }

  const otherGroupsSum = group.project.groups.filter((g) => g.id !== group.id).reduce((sum, g) => sum + g.maxStudents, 0);
  const newSum = otherGroupsSum + Number(maxStudents);

  if (newSum > group.project.studentCount) {
    const remaining = group.project.studentCount - otherGroupsSum;
    return NextResponse.json({ error: `Die maximale Schüleranzahl würde überschritten. Noch verfügbare Plätze: ${remaining}.` }, { status: 400 });
  }

  const updated = await prisma.group.update({
    where: { id: params.id },
    data: { name, description, maxStudents: Number(maxStudents) },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "STUDENT") {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const group = await loadGroupWithProject(params.id);
  if (!group) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });

  const allowed = session.user.role === "SUPERUSER" || group.project.ownerId === session.user.id;
  if (!allowed) return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });

  await prisma.group.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
