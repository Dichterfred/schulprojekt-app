import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPERUSER") {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPERUSER") {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
  const { password } = await req.json();
  if (!password || password.length < 4) {
    return NextResponse.json({ error: "Passwort muss mindestens 4 Zeichen haben." }, { status: 400 });
  }
  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { id: params.id }, data: { password: hashed } });
  return NextResponse.json({ success: true });
}
