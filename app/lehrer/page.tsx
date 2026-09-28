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
      background: "linear-gradient(160deg, #F2F2F7 0%, #E8EEF8 100%)",
      padding: "1.5rem",
    }}>
      <div style={{ width: "100%", maxWidth: 380 }}>

        {/* Logo / App Icon */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{
            width: 64, height: 64,
            borderRadius: 18,
            background: "linear-gradient(145deg, #007AFF, #0055D4)",
            boxShadow: "0 8px 24px rgba(0,122,255,0.35)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2rem",
            marginBottom: "1rem",
          }}>
            🏫
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.03em", marginBottom: "0.2rem" }}>Anmeldung</h1>
          <p style={{ color: "#6C6C70", fontSize: "0.9rem", margin: 0 }}>Schulprojekt Verwaltung &middot; Lehrer</p>
        </div>

        <div style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderRadius: 20,
          padding: "1.75rem",
          boxShadow: "0 8px 32px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
          border: "1px solid rgba(0,0,0,0.06)",
        }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ marginTop: 0 }}>Benutzername</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div style={{ marginBottom: "1.25rem" }}>
              <label>Passwort</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {error && (
              <div style={{
                background: "rgba(255,59,48,0.08)",
                border: "1px solid rgba(255,59,48,0.2)",
                borderRadius: 8,
                padding: "0.6rem 0.85rem",
                marginBottom: "1rem",
                color: "#FF3B30",
                fontSize: "0.85rem",
              }}>
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} style={{ width: "100%", padding: "0.7rem", borderRadius: 12, fontSize: "0.95rem" }}>
              {loading ? "Anmelden…" : "Anmelden"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", marginTop: "1.25rem", fontSize: "0.85rem", color: "#6C6C70" }}>
          Ich bin Schüler &mdash;{" "}
          <Link href="/schueler" style={{ color: "#007AFF", textDecoration: "none", fontWeight: 500 }}>Hier anmelden &rarr;</Link>
        </p>
      </div>
    </div>
  );
}
