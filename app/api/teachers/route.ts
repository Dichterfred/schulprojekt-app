import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPERUSER") {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
  const teachers = await prisma.user.findMany({
    where: { role: "TEACHER" },
    select: { id: true, username: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(teachers);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPERUSER") {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const body = await req.json();
  const { username, password } = body;

  if (!username || !password || password.length < 4) {
    return NextResponse.json({ error: "Benutzername und ein Passwort mit mind. 4 Zeichen sind erforderlich." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return NextResponse.json({ error: "Benutzername ist bereits vergeben." }, { status: 400 });

  const passwordHash = await bcrypt.hash(password, 10);
  const teacher = await prisma.user.create({
    data: { username, passwordHash, role: "TEACHER" },
    select: { id: true, username: true, createdAt: true },
  });

  return NextResponse.json(teacher, { status: 201 });
}
