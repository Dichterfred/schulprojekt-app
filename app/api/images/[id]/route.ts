import { prisma } from "@/lib/prisma";
import { handle, notFound, type IdParams } from "@/lib/api";

/** Liefert ein Bannerbild aus. Bilder ändern sich nie (neues Bild = neue ID), daher dauerhaft cachebar. */
export const GET = handle<IdParams>(async (_req, { params }) => {
  const image = await prisma.image.findUnique({ where: { id: (await params).id } });
  if (!image) throw notFound("Bild nicht gefunden.");
  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
