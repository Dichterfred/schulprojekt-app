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
      background: "linear-gradient(160deg, #F2F2F7 0%, #EEF4FF 100%)",
      padding: "1.5rem",
    }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{
            width: 56, height: 56,
            borderRadius: 16,
            background: "linear-gradient(145deg, #34C759, #248A3D)",
            boxShadow: "0 6px 20px rgba(52,199,89,0.35)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "1rem",
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              <path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.03em", marginBottom: "0.2rem" }}>Anmeldung</h1>
          <p style={{ color: "#6C6C70", fontSize: "0.9rem", margin: 0 }}>Schulprojekt Verwaltung &middot; Schüler</p>
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
              <label style={{ marginTop: 0 }}>Projekt-Code</label>
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="z. B. AB12CD" autoCapitalize="characters" autoCorrect="off" autoComplete="off" required />
            </div>
            <div style={{ marginBottom: "1.25rem" }}>
              <label>Vorname.Nachname</label>
              <input value={fullname} onChange={(e) => setFullname(e.target.value)} placeholder="max.mustermann" autoCapitalize="none" autoCorrect="off" autoComplete="off" required />
            </div>
            {error && (
              <div style={{ background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.2)", borderRadius: 8, padding: "0.6rem 0.85rem", marginBottom: "1rem", color: "#FF3B30", fontSize: "0.85rem" }}>
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} style={{ width: "100%", padding: "0.7rem", borderRadius: 12, fontSize: "0.95rem", background: "#34C759", boxShadow: "0 1px 3px rgba(52,199,89,0.3)" }}>
              {loading ? "Anmelden…" : "Anmelden"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", marginTop: "1.25rem", fontSize: "0.85rem", color: "#6C6C70" }}>
          Ich bin Lehrer —{" "}
          <Link href="/lehrer" style={{ color: "#007AFF", textDecoration: "none", fontWeight: 500 }}>Hier anmelden &rarr;</Link>
        </p>
      </div>
    </div>
  );
}
