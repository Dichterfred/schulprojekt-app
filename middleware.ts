import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  const isStudentArea = pathname.startsWith("/student");
  const isTeacherArea =
    pathname.startsWith("/projects") ||
    pathname.startsWith("/groups") ||
    pathname.startsWith("/settings");

  if (!token) {
    if (isStudentArea) return NextResponse.redirect(new URL("/schueler", req.url));
    return NextResponse.redirect(new URL("/lehrer", req.url));
  }

  const role = token.role as string;

  if (pathname.startsWith("/settings") && role !== "SUPERUSER") {
    return NextResponse.redirect(new URL("/projects", req.url));
  }

  if (isTeacherArea && role === "STUDENT") {
    return NextResponse.redirect(new URL("/student", req.url));
  }

  if (isStudentArea && role !== "STUDENT") {
    return NextResponse.redirect(new URL("/projects", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/projects/:path*", "/groups/:path*", "/settings/:path*", "/student/:path*"],
};
