import { DefaultSession } from "next-auth";

type AppRole = "SUPERUSER" | "TEACHER" | "STUDENT";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AppRole;
      /** Nur bei Schülern gesetzt. */
      projectDayId?: string;
      sessionVersion?: number;
    } & DefaultSession["user"];
  }
  interface User {
    id: string;
    role: AppRole;
    projectDayId?: string;
    sessionVersion?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: AppRole;
    projectDayId?: string;
    sessionVersion?: number;
  }
}
