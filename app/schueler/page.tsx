"use client";

import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SchuelerLoginPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [fullname, setFullname] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("student-login", { code, fullname, redirect: false });
    setLoading(false);
    if (res?.error) { setError("Code oder Vorname.Nachname ist falsch."); return; }
    router.push("/student");
    router.refresh();
  }

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      background: "linear-gradient(160deg, #EDFFF3 0%, #E4F9ED 50%, #F0FFF6 100%)",
      padding: "1.5rem",
    }}>
      <div style={{ width: "100%", maxWidth: 380 }}>

        {/* App Icon + Title */}
        <div style={{ textAlign: "center", marginBottom: "2.25rem" }}>
          <div style={{
            width: 72, height: 72,
            borderRadius: 20,
            background: "linear-gradient(145deg, #30D158, #1E8A3C)",
            boxShadow: "0 8px 28px rgba(52,199,89,0.38), 0 2px 8px rgba(0,0,0,0.10)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "1rem",
          }}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              <path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
          </div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 700, letterSpacing: "-0.035em", marginBottom: "0.25rem" }}>Willkommen</h1>
          <p style={{ color: "#6C6C70", fontSize: "0.88rem", margin: 0, fontWeight: 500 }}>
            Schulprojekt&nbsp;&middot;&nbsp;Schüler-Bereich
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
              <label style={{ marginTop: 0 }}>Projekt-Code</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="z. B. AB12CD"
                autoCapitalize="characters"
                autoCorrect="off"
                autoComplete="off"
                style={{ letterSpacing: "0.08em", fontWeight: 600 }}
                required
              />
            </div>
            <div style={{ marginBottom: "1.35rem" }}>
              <label>Vorname.Nachname</label>
              <input
                value={fullname}
                onChange={(e) => setFullname(e.target.value)}
                placeholder="max.mustermann"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="off"
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
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: 12,
                fontSize: "0.95rem",
                fontWeight: 600,
                background: "#34C759",
                boxShadow: "0 2px 8px rgba(52,199,89,0.28)",
              }}
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
          Du bist Lehrer?{" "}
          <Link href="/lehrer" style={{ color: "#007AFF", textDecoration: "none", fontWeight: 600 }}>
            Hier anmelden →
          </Link>
        </p>
      </div>
    </div>
  );
}
