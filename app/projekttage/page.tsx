"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDateOnly, formatDateTime } from "@/lib/dateHelpers";
import DescriptionRenderer from "@/components/DescriptionRenderer";
import { useMe } from "@/components/useMe";
import type { ProjectDay } from "@/lib/apiTypes";

export default function ProjectDaysPage() {
  const me = useMe();
  const isSuperuser = me?.role === "SUPERUSER";
  const [days, setDays] = useState<ProjectDay[] | null>(null);

  useEffect(() => {
    fetch("/api/project-days")
      .then((res) => (res.ok ? res.json() : []))
      .then(setDays);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="top-bar">
        <h1>Projekttage</h1>
        {isSuperuser && (
          <div className="top-bar-actions">
            <Link href="/projekttage/new"><button>+ Projekttag anlegen</button></Link>
          </div>
        )}
      </div>

      <div className="page-content">
        {days === null && <p style={{ color: "var(--color-text-faint)" }}>Lädt…</p>}

        {days?.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <p>Noch keine Projekttage vorhanden.</p>
            {isSuperuser && <Link href="/projekttage/new"><button>Ersten Projekttag anlegen</button></Link>}
          </div>
        )}

        <div className="card-grid">
          {days?.map((d) => (
            <div key={d.id} className="content-card">
              {d.bannerImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.bannerImage} alt="Banner" style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }} />
              ) : (
                <div style={{ height: 5, background: "linear-gradient(90deg,#007AFF,#5AC8FA)" }} />
              )}
              <div className="content-card-body">
                <h4 style={{ margin: "0 0 var(--space-1)" }}>{d.name}</h4>
                <div style={{ marginBottom: "var(--space-2)" }}>
                  {d.schoolClasses.map((c) => <span key={c.id} className="class-badge">{c.name}</span>)}
                </div>
                <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", marginBottom: "var(--space-2)", flex: 1, lineHeight: 1.55 }}>
                  <DescriptionRenderer text={d.description} />
                </div>
                <div style={{ display: "flex", gap: "var(--space-3)", fontSize: "var(--text-xs)", color: "var(--color-text-faint)", marginBottom: "var(--space-2)", flexWrap: "wrap" }}>
                  <span title="Zeitraum">📅 {formatDateOnly(d.startDate)} – {formatDateOnly(d.endDate)}</span>
                  <span title="Einschreibefrist">⏰ Frist: {formatDateTime(d.enrollmentDeadline)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "var(--space-2)" }}>
                  <span className="code-badge" title="Projekttag-Code für die Schüler-Anmeldung">{d.code}</span>
                  <Link href={`/projekttage/${d.id}`}>
                    <button className="secondary btn-sm">Projekte</button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
