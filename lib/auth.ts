import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginLimiter } from "@/lib/rateLimit";
import { verifyPin } from "@/lib/pin";
import { parseStudentLogin } from "@/lib/validation";

function clientIp(req: { headers?: Record<string, string | string[] | undefined> } | undefined): string {
  const forwarded = req?.headers?.["x-forwarded-for"];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return value?.split(",")[0]?.trim() || "unknown";
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      id: "teacher-login",
      name: "Lehrer/Superuser",
      credentials: {
        username: { label: "Benutzername", type: "text" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.username || !credentials?.password) return null;
        const key = `teacher:${clientIp(req)}:${credentials.username.toLowerCase()}`;
        if (!loginLimiter.isAllowed(key)) throw new Error("Zu viele Fehlversuche. Bitte später erneut versuchen.");

        const user = await prisma.user.findUnique({ where: { username: credentials.username } });
        const valid = user ? await bcrypt.compare(credentials.password, user.passwordHash) : false;
        if (!user || !valid) {
          loginLimiter.fail(key);
          return null;
        }
        loginLimiter.reset(key);
        return { id: user.id, name: user.username, role: user.role };
      },
    }),
    CredentialsProvider({
      id: "student-login",
      name: "Schüler",
      credentials: {
        code: { label: "Projekt-Code", type: "text" },
        fullname: { label: "Vorname.Nachname", type: "text" },
        pin: { label: "PIN", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.code || !credentials?.fullname || !credentials?.pin) return null;
        const code = credentials.code.trim().toUpperCase();
        const key = `student:${clientIp(req)}:${code}:${credentials.fullname.trim().toLowerCase()}`;
        if (!loginLimiter.isAllowed(key)) throw new Error("Zu viele Fehlversuche. Bitte später erneut versuchen.");

        const parsed = parseStudentLogin(credentials.fullname);
        const candidates = parsed
          ? await prisma.enrollment.findMany({
              where: {
                project: { code },
                student: {
                  firstName: { equals: parsed.firstName, mode: "insensitive" },
                  lastName: { equals: parsed.lastName, mode: "insensitive" },
                },
              },
              include: { student: true },
            })
          : [];

        for (const enrollment of candidates) {
          if (await verifyPin(credentials.pin.trim(), enrollment.pinHash)) {
            loginLimiter.reset(key);
            return {
              id: enrollment.studentId,
              name: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
              role: "STUDENT" as const,
              enrollmentId: enrollment.id,
              projectId: enrollment.projectId,
            };
          }
        }
        loginLimiter.fail(key);
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.enrollmentId = user.enrollmentId;
        token.projectId = user.projectId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.enrollmentId = token.enrollmentId;
        session.user.projectId = token.projectId;
      }
      return session;
    },
  },
};
