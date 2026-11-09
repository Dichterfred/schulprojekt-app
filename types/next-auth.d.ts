import { DefaultSession } from "next-auth";

type AppRole = "SUPERUSER" | "TEACHER" | "STUDENT";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AppRole;
      /** Nur bei Schülern gesetzt. */
      enrollmentId?: string;
      projectId?: string;
    } & DefaultSession["user"];
  }
  interface User {
    id: string;
    role: AppRole;
    enrollmentId?: string;
    projectId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: AppRole;
    enrollmentId?: string;
    projectId?: string;
  }
}
