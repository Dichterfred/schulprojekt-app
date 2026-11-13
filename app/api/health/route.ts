import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[health] Datenbank nicht erreichbar:", error);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
