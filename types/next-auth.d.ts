import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "SUPERUSER" | "TEACHER" | "STUDENT";
    } & DefaultSession["user"];
  }
  interface User {
    id: string;
    role: "SUPERUSER" | "TEACHER" | "STUDENT";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "SUPERUSER" | "TEACHER" | "STUDENT";
  }
}
