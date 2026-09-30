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
    if (res?.error) {
      setError("Code oder Vorname.Nachname ist falsch.");
      return;
    }
    router.push("/student");
    router.refresh();
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f4f5f7" }}>
      <form onSubmit={handleSubmit} className="card" style={{ width: "100%", maxWidth: 360 }}>
        <h2 style={{ marginTop: 0 }}>Anmeldung für Schüler</h2>
        <label>Projekt-Code</label>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="z. B. AB12CD" required />
        <label>Vorname.Nachname</label>
        <input value={fullname} onChange={(e) => setFullname(e.target.value)} placeholder="max.mustermann" required />
        {error && <p className="error-text">{error}</p>}
        <button type="submit" disabled={loading} style={{ width: "100%" }}>{loading ? "Anmelden..." : "Anmelden"}</button>
        <p style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.85rem" }}>
          <Link href="/lehrer">Ich bin Lehrer &rarr;</Link>
        </p>
      </form>
    </div>
  );
}
