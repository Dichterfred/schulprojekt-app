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
      background: "var(--color-bg)",
      padding: "var(--space-6)",
    }}>
      <div style={{ width: "100%", maxWidth: 380 }}>

        {/* App Icon + Title */}
        <div style={{ textAlign: "center", marginBottom: "var(--space-10)" }}>
          <div style={{
            width: 64, height: 64,
            borderRadius: 18,
            background: "var(--color-success)",
            boxShadow: "var(--shadow-lg)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "var(--space-4)",
          }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-inverse)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              <path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
          </div>
          <h1 style={{ fontSize: "var(--text-xl)", fontWeight: 700, letterSpacing: "-0.035em", marginBottom: "var(--space-1)" }}>Willkommen</h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)", margin: 0 }}>
            Schulprojekt &middot; Schüler-Bereich
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
              <label style={{ marginTop: 0 }}>Projekt-Code</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="z. B. AB12CD"
                autoCapitalize="characters"
                autoCorrect="off"
                autoComplete="off"
                style={{ letterSpacing: "0.08em", fontWeight: 600 }}
                required
              />
            </div>
            <div style={{ marginBottom: "var(--space-6)" }}>
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
              <div className="error-banner">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="success"
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
          Du bist Lehrer?{" "}
          <Link href="/lehrer" style={{ color: "var(--color-primary)", textDecoration: "none", fontWeight: 600 }}>
            Hier anmelden →
          </Link>
        </p>
      </div>
    </div>
  );
}
