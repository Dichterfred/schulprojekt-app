"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton({ callbackUrl }: { callbackUrl: string }) {
  return (
    <button className="secondary" onClick={() => signOut({ callbackUrl })}>
      Abmelden
    </button>
  );
}
