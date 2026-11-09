import { describe, expect, it } from "vitest";
import { guardRedirect } from "@/lib/routeGuard";
import { config } from "@/proxy";

describe("guardRedirect", () => {
  it("leitet ohne Sitzung im Lehrerbereich zum Lehrer-Login", () => {
    expect(guardRedirect("/projekttage", null)).toBe("/lehrer");
    expect(guardRedirect("/projekttage/abc/edit", null)).toBe("/lehrer");
    expect(guardRedirect("/schueler-verwaltung", null)).toBe("/lehrer");
    expect(guardRedirect("/settings", null)).toBe("/lehrer");
  });

  it("leitet ohne Sitzung im Schülerbereich zum Schüler-Login", () => {
    expect(guardRedirect("/student", null)).toBe("/schueler");
  });

  it("lässt Lehrer auf Projekttage, aber nicht auf Super-User-Seiten", () => {
    expect(guardRedirect("/projekttage", "TEACHER")).toBeNull();
    expect(guardRedirect("/projekttage/x/projekte/new", "TEACHER")).toBeNull();
    expect(guardRedirect("/schueler-verwaltung", "TEACHER")).toBe("/projekttage");
    expect(guardRedirect("/settings", "TEACHER")).toBe("/projekttage");
  });

  it("leitet Lehrer von den Projekttag-Formularen weg, lässt Projekt-Formulare aber zu", () => {
    expect(guardRedirect("/projekttage/new", "TEACHER")).toBe("/projekttage");
    expect(guardRedirect("/projekttage/abc/edit", "TEACHER")).toBe("/projekttage");
    expect(guardRedirect("/projekttage/abc", "TEACHER")).toBeNull();
    expect(guardRedirect("/projekttage/abc/projekte/new", "TEACHER")).toBeNull();
    expect(guardRedirect("/projekttage/abc/projekte/p1/edit", "TEACHER")).toBeNull();
    expect(guardRedirect("/projekttage/new", "SUPERUSER")).toBeNull();
    expect(guardRedirect("/projekttage/abc/edit", "SUPERUSER")).toBeNull();
  });

  it("lässt den Super User überall in den Lehrerbereich", () => {
    expect(guardRedirect("/projekttage", "SUPERUSER")).toBeNull();
    expect(guardRedirect("/schueler-verwaltung", "SUPERUSER")).toBeNull();
    expect(guardRedirect("/settings", "SUPERUSER")).toBeNull();
  });

  it("schickt Schüler aus dem Lehrerbereich und Lehrer aus dem Schülerbereich", () => {
    expect(guardRedirect("/projekttage", "STUDENT")).toBe("/student");
    expect(guardRedirect("/schueler-verwaltung", "STUDENT")).toBe("/student");
    expect(guardRedirect("/settings", "STUDENT")).toBe("/student");
    expect(guardRedirect("/student", "STUDENT")).toBeNull();
    expect(guardRedirect("/student", "TEACHER")).toBe("/projekttage");
    expect(guardRedirect("/student", "SUPERUSER")).toBe("/projekttage");
  });

  it("verwechselt ähnliche Pfade nicht mit geschützten Bereichen", () => {
    expect(guardRedirect("/schueler", null)).toBeNull();
    expect(guardRedirect("/projekttage-alt", null)).toBeNull();
  });

  it("matcher deckt genau die geschützten Bereiche ab", () => {
    expect(config.matcher).toEqual([
      "/projekttage/:path*",
      "/schueler-verwaltung/:path*",
      "/settings/:path*",
      "/student/:path*",
    ]);
  });
});
