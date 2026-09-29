import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkProjectAccess(projectId: string, userId: string, role: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId }, include: { groups: true } });
  if (!project) return { project: null, allowed: false };
  const allowed = role === "SUPERUSER" || project.ownerId === userId;
  return { project, allowed };
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "STUDENT") {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId erforderlich." }, { status: 400 });

  const { project, allowed } = await checkProjectAccess(projectId, session.user.id, session.user.role);
  if (!project || !allowed) {
    return NextResponse.json({ error: "Nicht gefunden oder keine Berechtigung." }, { status: 404 });
  }

  return NextResponse.json(project.groups);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "STUDENT") {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const body = await req.json();
  const { name, description, maxStudents, projectId, bannerImage } = body;

  if (!name || !description || !maxStudents || maxStudents <= 0 || !projectId) {
    return NextResponse.json({ error: "Ungültige Eingabedaten." }, { status: 400 });
  }

  const { project, allowed } = await checkProjectAccess(projectId, session.user.id, session.user.role);
  if (!project || !allowed) {
    return NextResponse.json({ error: "Nicht gefunden oder keine Berechtigung." }, { status: 404 });
  }

  const currentSum = project.groups.reduce((sum, g) => sum + g.maxStudents, 0);
  const newSum = currentSum + Number(maxStudents);

  if (newSum > project.studentCount) {
    const remaining = project.studentCount - currentSum;
    return NextResponse.json({ error: `Die maximale Schüleranzahl würde überschritten. Noch verfügbare Plätze: ${remaining}.` }, { status: 400 });
  }

  const group = await prisma.group.create({
    data: { name, description, maxStudents: Number(maxStudents), projectId, bannerImage: bannerImage ?? null },
  });
  return NextResponse.json(group, { status: 201 });
}
