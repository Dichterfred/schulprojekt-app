import { NextResponse } from "next/server";
import { getServerSession, type Session } from "next-auth";
import { Prisma } from "@prisma/client";
import { ZodError, type ZodTypeAny, type z } from "zod";
import { authOptions } from "@/lib/auth";

export type AppRole = "SUPERUSER" | "TEACHER" | "STUDENT";

/** Fehler, der direkt als JSON-Antwort mit Status an den Client geht. */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const notFound = (msg = "Nicht gefunden oder keine Berechtigung.") => new ApiError(404, msg);
export const badRequest = (msg: string) => new ApiError(400, msg);

/** Liefert die Session, wenn der Nutzer eine der Rollen hat – sonst ApiError 401/403. */
export async function requireRole(...roles: AppRole[]): Promise<Session> {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new ApiError(401, "Nicht angemeldet.");
  if (!roles.includes(session.user.role)) throw new ApiError(403, "Keine Berechtigung.");
  return session;
}

/** Liest den JSON-Body und validiert ihn mit Zod. */
export async function parseBody<S extends ZodTypeAny>(req: Request, schema: S): Promise<z.output<S>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw badRequest("Ungültiger JSON-Body.");
  }
  return schema.parse(body);
}

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

/** Einheitliche Fehlerbehandlung für alle API-Routen. */
export function handle<C = unknown>(fn: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

export function toErrorResponse(err: unknown): Response {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (err instanceof ZodError) {
    return NextResponse.json({ error: err.issues[0]?.message ?? "Ungültige Eingabedaten." }, { status: 400 });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    if (err.code === "P2002") return NextResponse.json({ error: "Eintrag existiert bereits." }, { status: 409 });
    if (err.code === "P2003") return NextResponse.json({ error: "Verknüpfter Eintrag existiert nicht." }, { status: 400 });
  }
  console.error("[api] Unerwarteter Fehler:", err);
  return NextResponse.json({ error: "Interner Serverfehler." }, { status: 500 });
}

export type IdParams = { params: Promise<{ id: string }> };
