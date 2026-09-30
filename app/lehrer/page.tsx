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
    if (res?.error) {
      setError("Benutzername oder Passwort ist falsch.");
      return;
    }
    router.push("/projects");
    router.refresh();
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f4f5f7" }}>
      <form onSubmit={handleSubmit} className="card" style={{ width: "100%", maxWidth: 360 }}>
        <h2 style={{ marginTop: 0 }}>Anmeldung für Lehrer</h2>
        <label>Benutzername</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        <label>Passwort</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="error-text">{error}</p>}
        <button type="submit" disabled={loading} style={{ width: "100%" }}>{loading ? "Anmelden..." : "Anmelden"}</button>
        <p style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.85rem" }}>
          <Link href="/schueler">Ich bin Schüler &rarr;</Link>
        </p>
      </form>
    </div>
  );
}
