"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton({ callbackUrl }: { callbackUrl?: string }) {
  // Relativ weiterleiten statt über NEXTAUTH_URL (siehe Sidebar-Logout).
  async function handleLogout() {
    try {
      await signOut({ redirect: false });
    } finally {
      window.location.href = callbackUrl || "/";
    }
  }

  return (
    <button
      onClick={handleLogout}
      style={{
        background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        color: "#1C1C1E",
        border: "1px solid rgba(0,0,0,0.1)",
        borderRadius: 20,
        padding: "0.4rem 1rem",
        fontWeight: 600,
        fontSize: "0.85rem",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      Abmelden
    </button>
  );
}
