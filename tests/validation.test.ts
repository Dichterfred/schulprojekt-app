import { describe, expect, it } from "vitest";
import {
  passwordSchema,
  priorityRankSchema,
  projectDaySchema,
  projectSchema,
  studentCreateSchema,
  studentsPdfRequestSchema,
  studentUpdateSchema,
} from "@/lib/validation";

const validProject = {
  name: "Theater",
  description: "Beschreibung",
  schoolClassIds: ["c1"],
  startDate: "2026-12-01T00:00:00.000Z",
  endDate: "2026-12-05T23:59:59.999Z",
  enrollmentDeadline: "2026-11-20T12:00:00.000Z",
};

describe("projectDaySchema", () => {
  it("akzeptiert gültige Daten und wandelt Zahlen/Daten um", () => {
    const parsed = projectDaySchema.parse(validProject);
    expect(parsed.name).toBe("Theater");
    expect(parsed.startDate).toBeInstanceOf(Date);
  });

  it("lehnt Ende vor Start ab", () => {
    const result = projectDaySchema.safeParse({ ...validProject, endDate: "2026-11-01T00:00:00.000Z" });
    expect(result.success).toBe(false);
  });

  it("lehnt eine Einschreibefrist nach Projektende ab", () => {
    const result = projectDaySchema.safeParse({ ...validProject, enrollmentDeadline: "2027-01-01T00:00:00.000Z" });
    expect(result.success).toBe(false);
  });

  it("lehnt fehlende Klassen ab", () => {
    expect(projectDaySchema.safeParse({ ...validProject, schoolClassIds: [] }).success).toBe(false);
  });

  it("macht aus der Bild-URL die Bild-ID und lehnt fremde URLs ab", () => {
    expect(projectDaySchema.parse({ ...validProject, bannerImage: "/api/images/abc123" }).bannerImage).toBe("abc123");
    expect(projectDaySchema.parse({ ...validProject, bannerImage: null }).bannerImage).toBeNull();
    expect(projectDaySchema.safeParse({ ...validProject, bannerImage: "https://evil.example/pixel.png" }).success).toBe(false);
    expect(projectDaySchema.safeParse({ ...validProject, bannerImage: "data:image/png;base64,AAAA" }).success).toBe(false);
  });
});

describe("weitere Schemas", () => {
  it("projectSchema verlangt positive ganze Plätze", () => {
    expect(projectSchema.safeParse({ name: "A", description: "B", maxStudents: 0 }).success).toBe(false);
    expect(projectSchema.safeParse({ name: "A", description: "B", maxStudents: 5 }).success).toBe(true);
  });

  it("projectSchema: excludedClassIds fehlt → []", () => {
    expect(projectSchema.parse({ name: "A", description: "B", maxStudents: 5 }).excludedClassIds).toEqual([]);
    expect(projectSchema.parse({ name: "A", description: "B", maxStudents: 5, excludedClassIds: ["c"] }).excludedClassIds).toEqual(["c"]);
  });

  it("studentUpdateSchema ist teilweise", () => {
    expect(studentUpdateSchema.safeParse({}).success).toBe(true);
    expect(studentUpdateSchema.safeParse({ firstName: "Max" }).success).toBe(true);
    expect(studentUpdateSchema.safeParse({ firstName: "M.x" }).success).toBe(false);
  });

  it("studentsPdfRequestSchema akzeptiert {}, classId und studentIds", () => {
    expect(studentsPdfRequestSchema.safeParse({}).success).toBe(true);
    expect(studentsPdfRequestSchema.safeParse({ classId: "c" }).success).toBe(true);
    expect(studentsPdfRequestSchema.safeParse({ studentIds: ["s"] }).success).toBe(true);
    expect(studentsPdfRequestSchema.safeParse({ studentIds: [] }).success).toBe(false);
  });

  it("passwordSchema verlangt mindestens 8 Zeichen und einen Text", () => {
    expect(passwordSchema.safeParse({ password: "1234567" }).success).toBe(false);
    expect(passwordSchema.safeParse({ password: 12345678 }).success).toBe(false);
    expect(passwordSchema.safeParse({ password: "12345678" }).success).toBe(true);
  });

  it("studentCreateSchema verbietet Punkte im Namen", () => {
    expect(studentCreateSchema.safeParse({ firstName: "Max", lastName: "Mus.ter", schoolClassId: "c" }).success).toBe(false);
    expect(studentCreateSchema.safeParse({ firstName: " Max ", lastName: "Muster", schoolClassId: "c" }).success).toBe(true);
  });

  it("priorityRankSchema verlangt eine ganze Zahl ≥ 1", () => {
    expect(priorityRankSchema.safeParse({ projectId: "p", priority: "abc" }).success).toBe(false);
    expect(priorityRankSchema.safeParse({ projectId: "p", priority: 1.5 }).success).toBe(false);
    expect(priorityRankSchema.safeParse({ projectId: "p", priority: 0 }).success).toBe(false);
    expect(priorityRankSchema.safeParse({ projectId: "p", priority: 2 }).success).toBe(true);
  });
});

describe("deutsche Fehlermeldungen", () => {
  const firstMessage = (r: { success: boolean; error?: { issues: { message: string }[] } }) => r.error?.issues[0]?.message;

  it("bei ungültiger Zahl", () => {
    expect(firstMessage(projectSchema.safeParse({ name: "G", description: "d", maxStudents: "abc" }))).toBe(
      "Maximale Schüleranzahl muss eine Zahl sein."
    );
  });

  it("bei ungültigem Datum", () => {
    expect(firstMessage(projectDaySchema.safeParse({ ...validProject, startDate: "kein-datum" }))).toBe(
      "Start: ungültiges Datum."
    );
  });

  it("bei Passwort, das kein Text ist", () => {
    expect(firstMessage(passwordSchema.safeParse({ password: 12345678 }))).toBe("Passwort muss ein Text sein.");
  });
});
