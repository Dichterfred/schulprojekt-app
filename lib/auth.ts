import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

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
      // @ts-ignore
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        const user = await prisma.user.findUnique({ where: { username: credentials.username } });
        if (!user || !user.passwordHash) return null;
        if (user.role === "STUDENT") return null;
        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;
        return { id: user.id, name: user.username || "", role: user.role };
      },
    }),
    CredentialsProvider({
      id: "student-login",
      name: "Schüler",
      credentials: {
        code: { label: "Projekt-Code", type: "text" },
        fullname: { label: "Vorname.Nachname", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.code || !credentials?.fullname) return null;
        const project = await prisma.project.findUnique({
          where: { code: credentials.code.trim().toUpperCase() },
        });
        if (!project) return null;
        const parts = credentials.fullname.trim().toLowerCase().split(".");
        if (parts.length !== 2) return null;
        const [firstName, lastName] = parts;
        const students = await prisma.user.findMany({
          where: { role: "STUDENT", enrolledProjectId: project.id },
        });
        const match = students.find(
          (s) =>
            (s.firstName || "").trim().toLowerCase() === firstName &&
            (s.lastName || "").trim().toLowerCase() === lastName
        );
        if (!match) return null;
        return { id: match.id, name: `${match.firstName} ${match.lastName}`, role: "STUDENT" };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
};
