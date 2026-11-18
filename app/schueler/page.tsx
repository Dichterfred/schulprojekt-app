"use client";

import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AcademicCapIcon, ArrowRightIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";

export default function SchuelerLoginPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("student-login", { code, username, password, redirect: false });
    setLoading(false);
    if (!res || res.error) {
      // Generische Meldung (kein Hinweis, welcher Teil falsch war); nur die Sperre nach Fehlversuchen wird genannt.
      setError(
        res?.error?.startsWith("Zu viele Fehlversuche")
          ? res.error
          : "Anmeldung fehlgeschlagen. Bitte Projekttag-Code, Anmeldename und Passwort prüfen.",
      );
      return;
    }
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
            <AcademicCapIcon width={30} height={30} style={{ color: "var(--color-text-inverse)" }} aria-hidden="true" />
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
              <label style={{ marginTop: 0 }} htmlFor="login-code">Projekttag-Code</label>
              <input
                id="login-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Code vom Aushang"
                autoCapitalize="characters"
                autoCorrect="off"
                autoComplete="off"
                style={{ letterSpacing: "0.08em", fontWeight: 600 }}
                required
              />
            </div>
            <div style={{ marginBottom: "var(--space-4)" }}>
              <label htmlFor="login-username">Anmeldename</label>
              <input
                id="login-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="vorname.nachname"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="username"
                required
              />
            </div>
            <div style={{ marginBottom: "var(--space-6)" }}>
              <label htmlFor="login-password">Passwort</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div className="error-banner">
                <ExclamationCircleIcon width={16} height={16} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
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
            Hier anmelden <ArrowRightIcon width={14} height={14} style={{ display: "inline-block", verticalAlign: "-2px" }} aria-hidden="true" />
          </Link>
        </p>
      </div>
    </div>
  );
}
