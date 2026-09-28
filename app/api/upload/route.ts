import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join, extname } from "path";
import { randomUUID } from "crypto";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_MB = 5;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "STUDENT") {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const folder = (formData.get("folder") as string) || "misc";

  if (!file) {
    return NextResponse.json({ error: "Keine Datei übermittelt." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Nur JPEG, PNG, WebP und GIF sind erlaubt." }, { status: 400 });
  }

  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return NextResponse.json({ error: `Maximale Dateigröße: ${MAX_SIZE_MB} MB.` }, { status: 400 });
  }

  const ext = extname(file.name) || ".jpg";
  const filename = `${randomUUID()}${ext}`;
  const uploadDir = join(process.cwd(), "public", "uploads", folder);
  await mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(join(uploadDir, filename), buffer);

  return NextResponse.json({ url: `/uploads/${folder}/${filename}` }, { status: 201 });
}
