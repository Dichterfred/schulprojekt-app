"use client";

import { useRef, useState } from "react";
import Image from "next/image";

interface Props {
  folder: "projects" | "groups";
  currentUrl?: string | null;
  onUploaded: (url: string) => void;
  onRemove: () => void;
}

export default function BannerUpload({ folder, currentUrl, onUploaded, onRemove }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload fehlgeschlagen.");
      onUploaded(data.url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div style={{ marginBottom: "1rem" }}>
      <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 500 }}>Banner-Bild (optional)</label>

      {currentUrl ? (
        <div style={{ position: "relative", width: "100%", height: 140, borderRadius: 8, overflow: "hidden", marginBottom: "0.5rem" }}>
          <Image src={currentUrl} alt="Banner" fill style={{ objectFit: "cover" }} unoptimized />
          <button
            type="button"
            onClick={onRemove}
            style={{
              position: "absolute", top: 6, right: 6,
              background: "rgba(0,0,0,0.55)", color: "#fff",
              border: "none", borderRadius: 4, padding: "2px 8px",
              cursor: "pointer", fontSize: "0.8rem",
            }}
          >
            ✕ Entfernen
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          style={{
            width: "100%", height: 100, border: "2px dashed #ccc",
            borderRadius: 8, display: "flex", alignItems: "center",
            justifyContent: "center", cursor: "pointer", color: "#888",
            fontSize: "0.9rem", marginBottom: "0.5rem",
          }}
        >
          {uploading ? "Wird hochgeladen …" : "+ Bild auswählen (JPEG / PNG / WebP, max. 5 MB)"}
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: "none" }} onChange={handleFile} />

      {!currentUrl && !uploading && (
        <button type="button" className="secondary" style={{ fontSize: "0.8rem" }} onClick={() => inputRef.current?.click()}>
          Bild hochladen
        </button>
      )}

      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
