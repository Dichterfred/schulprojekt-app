import { apiError } from "@/lib/apiTypes";
import { fileNameFromDisposition, studentsPdfBody } from "@/lib/forms";

type PdfRequest = ReturnType<typeof studentsPdfBody> | { studentIds: string[] };

/**
 * Lädt die Zugangsdaten-PDF per fetch → Blob → Objekt-URL herunter.
 * Liefert `null` bei Erfolg, sonst die Fehlermeldung.
 */
export async function downloadStudentsPdf(body: PdfRequest): Promise<string | null> {
  let res: Response;
  try {
    res = await fetch("/api/students/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return "Netzwerkfehler beim Erzeugen der PDF.";
  }
  if (!res.ok) return apiError(res, "PDF konnte nicht erzeugt werden.");

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileNameFromDisposition(res.headers.get("Content-Disposition"), "zugangsdaten.pdf");
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    // Kurz verzögert freigeben, damit der Download sicher gestartet ist
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return null;
}
