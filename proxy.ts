import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { guardRedirect, type GuardRole } from "@/lib/routeGuard";

export async function proxy(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const role = token ? ((token.role as GuardRole | undefined) ?? null) : null;
  const target = guardRedirect(req.nextUrl.pathname, role);
  return target ? NextResponse.redirect(new URL(target, req.url)) : NextResponse.next();
}

export const config = {
  matcher: ["/projekttage/:path*", "/schueler-verwaltung/:path*", "/settings/:path*", "/student/:path*"],
};
