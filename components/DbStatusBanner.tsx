"use client";

import { useEffect, useState } from "react";

const INTERVAL_MS = 30000;

export default function DbStatusBanner() {
  const [down, setDown] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        if (!cancelled) setDown(!res.ok);
      } catch {
        if (!cancelled) setDown(true);
      }
    }

    check();
    const id = setInterval(check, INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (!down) return null;

  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        top: "0.75rem",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 2000,
        maxWidth: "90vw",
        padding: "0.6rem 1.1rem",
        borderRadius: "14px",
        background: "rgba(255,59,48,0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        color: "#fff",
        fontSize: "0.85rem",
        fontWeight: 500,
        boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
      }}
    >
      Datenbank nicht erreichbar. Daten können derzeit nicht geladen oder gespeichert werden.
    </div>
  );
}
