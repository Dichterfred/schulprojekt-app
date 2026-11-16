"use client";

import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LehrerLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("teacher-login", { username, password, redirect: false });
    setLoading(false);
    if (res?.error) { setError(res.error === "CredentialsSignin" ? "Benutzername oder Passwort ist falsch." : res.error); return; }
    router.push("/projekttage");
    router.refresh();
  }

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      background: "var(--color-bg)",
      padding: "var(--space-6)",
    }}>
      <div style={{ width: "100%", maxWidth: 380 }}>

        {/* App Icon + Title */}
        <div style={{ textAlign: "center", marginBottom: "var(--space-10)" }}>
          <div style={{
            width: 64, height: 64,
            borderRadius: 18,
            background: "var(--color-primary)",
            boxShadow: "var(--shadow-lg)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "var(--space-4)",
          }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-inverse)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <h1 style={{ fontSize: "var(--text-xl)", fontWeight: 700, letterSpacing: "-0.035em", marginBottom: "var(--space-1)" }}>Willkommen</h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)", margin: 0 }}>
            Schulprojekt &middot; Lehrer-Bereich
          </p>
        </div>

        {/* Form Card */}
        <div style={{
          background: "var(--color-surface)",
          borderRadius: "var(--radius-2xl)",
          padding: "var(--space-8) var(--space-6)",
          boxShadow: "var(--shadow-lg)",
          border: "1px solid oklch(from var(--color-text) l c h / 0.07)",
        }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "var(--space-4)" }}>
              <label style={{ marginTop: 0 }}>Benutzername</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="Dein Benutzername"
                required
              />
            </div>
            <div style={{ marginBottom: "var(--space-6)" }}>
              <label>Passwort</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="error-banner">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", padding: "var(--space-3)", borderRadius: "var(--radius-lg)", fontSize: "var(--text-base)", fontWeight: 600 }}
            >
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", justifyContent: "center" }}>
                  <span style={{ width: 16, height: 16, border: "2px solid oklch(from var(--color-text-inverse) l c h / 0.4)", borderTopColor: "var(--color-text-inverse)", borderRadius: "50%", animation: "spin 0.65s linear infinite", display: "inline-block" }} />
                  Anmelden…
                </span>
              ) : "Anmelden"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", marginTop: "var(--space-5)", fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
          Du bist Schüler?{" "}
          <Link href="/schueler" style={{ color: "var(--color-primary)", textDecoration: "none", fontWeight: 600 }}>
            Hier anmelden →
          </Link>
        </p>
      </div>
    </div>
  );
}
