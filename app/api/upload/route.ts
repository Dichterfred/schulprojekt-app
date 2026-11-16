import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, handle, requireRole } from "@/lib/api";
import { imageUrl } from "@/lib/validation";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_MB = 5;
const ORPHAN_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Speichert ein Bild in der Tabelle `Image` und gibt seine URL zurück.
 * Die URL wird anschließend beim Speichern von Projekttag/Projekt als `bannerImage` mitgeschickt.
 */
export const POST = handle(async (req) => {
  await requireRole("SUPERUSER", "TEACHER");

  const file = (await req.formData()).get("file");
  if (!(file instanceof File)) throw badRequest("Keine Datei übermittelt.");
  if (!ALLOWED_TYPES.includes(file.type)) throw badRequest("Nur JPEG, PNG, WebP und GIF sind erlaubt.");
  if (file.size > MAX_SIZE_MB * 1024 * 1024) throw badRequest(`Maximale Dateigröße: ${MAX_SIZE_MB} MB.`);

  const image = await prisma.image.create({
    data: { mimeType: file.type, data: Buffer.from(await file.arrayBuffer()) },
    select: { id: true },
  });

  // Hochgeladene, aber nie verwendete Bilder (z. B. abgebrochenes Formular) aufräumen.
  await prisma.image.deleteMany({
    where: { projectDay: null, project: null, createdAt: { lt: new Date(Date.now() - ORPHAN_MAX_AGE_MS) } },
  });

  return NextResponse.json({ url: imageUrl(image.id) }, { status: 201 });
});
