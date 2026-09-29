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
    if (res?.error) { setError("Benutzername oder Passwort ist falsch."); return; }
    router.push("/projects");
    router.refresh();
  }

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      background: "linear-gradient(160deg, #EEF2FF 0%, #E8F0FE 50%, #F0F4FF 100%)",
      padding: "1.5rem",
    }}>
      <div style={{ width: "100%", maxWidth: 380 }}>

        {/* App Icon + Title */}
        <div style={{ textAlign: "center", marginBottom: "2.25rem" }}>
          <div style={{
            width: 72, height: 72,
            borderRadius: 20,
            background: "linear-gradient(145deg, #0A84FF, #0055D4)",
            boxShadow: "0 8px 28px rgba(0,122,255,0.38), 0 2px 8px rgba(0,0,0,0.12)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "1rem",
          }}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 700, letterSpacing: "-0.035em", marginBottom: "0.25rem" }}>Willkommen</h1>
          <p style={{ color: "#6C6C70", fontSize: "0.88rem", margin: 0, fontWeight: 500 }}>
            Schulprojekt&nbsp;&middot;&nbsp;Lehrer-Bereich
          </p>
        </div>

        {/* Form Card */}
        <div style={{
          background: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderRadius: 22,
          padding: "1.85rem 1.75rem",
          boxShadow: "0 12px 40px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.05)",
          border: "1px solid rgba(255,255,255,0.7)",
        }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "0.85rem" }}>
              <label style={{ marginTop: 0 }}>Benutzername</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="Dein Benutzername"
                required
              />
            </div>
            <div style={{ marginBottom: "1.35rem" }}>
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
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "rgba(255,59,48,0.07)",
                border: "1px solid rgba(255,59,48,0.18)",
                borderRadius: 10,
                padding: "0.65rem 0.9rem",
                marginBottom: "1rem",
                color: "#FF3B30",
                fontSize: "0.85rem",
                fontWeight: 500,
              }}>
                <span style={{ fontSize: "1rem", flexShrink: 0 }}>⚠️</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", padding: "0.75rem", borderRadius: 12, fontSize: "0.95rem", fontWeight: 600 }}
            >
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", justifyContent: "center" }}>
                  <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.65s linear infinite", display: "inline-block" }} />
                  Anmelden…
                </span>
              ) : "Anmelden"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", marginTop: "1.35rem", fontSize: "0.85rem", color: "#6C6C70" }}>
          Du bist Schüler?{" "}
          <Link href="/schueler" style={{ color: "#007AFF", textDecoration: "none", fontWeight: 600 }}>
            Hier anmelden →
          </Link>
        </p>
      </div>
    </div>
  );
}
