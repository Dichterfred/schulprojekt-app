import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginLimiter } from "@/lib/rateLimit";
import { verifyStudentPassword } from "@/lib/studentPassword";
import { normalizeLoginName } from "@/lib/username";

/** bcrypt-Hash eines zufälligen, verworfenen Werts – nur für gleichmäßige Laufzeit bei unbekannten Schülern. */
const DUMMY_HASH = "$2a$10$BDxnS0QtBk4yhnq4J35ETO6C1MD/91AXGtc.byPMpergzQCE2T8P.";

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
        code: { label: "Projekttag-Code", type: "text" },
        username: { label: "Anmeldename", type: "text" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.code || !credentials?.username || !credentials?.password) return null;
        const code = credentials.code.trim().toUpperCase();
        const username = normalizeLoginName(credentials.username);
        const key = `student:${clientIp(req)}:${code}:${username}`;
        if (!loginLimiter.isAllowed(key)) throw new Error("Zu viele Fehlversuche. Bitte später erneut versuchen.");

        const [projectDay, student] = await Promise.all([
          prisma.projectDay.findUnique({ where: { code }, select: { id: true, schoolClasses: { select: { id: true } } } }),
          prisma.student.findUnique({
            where: { username },
            select: { id: true, firstName: true, lastName: true, passwordHash: true, sessionVersion: true, schoolClassId: true },
          }),
        ]);
        // Auch bei unbekanntem Anmeldenamen bcrypt ausführen, damit die Antwortzeit nichts verrät.
        const passwordOk = await verifyStudentPassword(credentials.password, student?.passwordHash ?? DUMMY_HASH);
        const classOk = !!student && !!projectDay?.schoolClasses.some((c) => c.id === student.schoolClassId);

        // Generischer Fehlschlag: kein Hinweis, welcher Teil falsch war.
        if (!student || !projectDay || !passwordOk || !classOk) {
          loginLimiter.fail(key);
          return null;
        }
        loginLimiter.reset(key);
        return {
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
          role: "STUDENT" as const,
          projectDayId: projectDay.id,
          sessionVersion: student.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.projectDayId = user.projectDayId;
        token.sessionVersion = user.sessionVersion;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.projectDayId = token.projectDayId;
        session.user.sessionVersion = token.sessionVersion;
      }
      return session;
    },
  },
};
