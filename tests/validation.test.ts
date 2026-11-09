import { describe, expect, it } from "vitest";
import {
  groupSchema,
  parseStudentLogin,
  passwordSchema,
  priorityRankSchema,
  projectSchema,
  studentCreateSchema,
} from "@/lib/validation";

const validProject = {
  name: "Theater",
  description: "Beschreibung",
  studentCount: 30,
  schoolClassIds: ["c1"],
  startDate: "2026-12-01T00:00:00.000Z",
  endDate: "2026-12-05T23:59:59.999Z",
  enrollmentDeadline: "2026-11-20T12:00:00.000Z",
};

describe("parseStudentLogin", () => {
  it("trennt am letzten Punkt und ignoriert Groß-/Kleinschreibung", () => {
    expect(parseStudentLogin(" Anna-Lena.Von Der Heide ")).toEqual({ firstName: "anna-lena", lastName: "von der heide" });
  });

  it("lehnt Eingaben ohne gültigen Punkt ab", () => {
    expect(parseStudentLogin("max")).toBeNull();
    expect(parseStudentLogin(".mustermann")).toBeNull();
    expect(parseStudentLogin("max.")).toBeNull();
  });
});

describe("projectSchema", () => {
  it("akzeptiert gültige Daten und wandelt Zahlen/Daten um", () => {
    const parsed = projectSchema.parse({ ...validProject, studentCount: "30" });
    expect(parsed.studentCount).toBe(30);
    expect(parsed.startDate).toBeInstanceOf(Date);
  });

  it("lehnt Ende vor Start ab", () => {
    const result = projectSchema.safeParse({ ...validProject, endDate: "2026-11-01T00:00:00.000Z" });
    expect(result.success).toBe(false);
  });

  it("lehnt eine Einschreibefrist nach Projektende ab", () => {
    const result = projectSchema.safeParse({ ...validProject, enrollmentDeadline: "2027-01-01T00:00:00.000Z" });
    expect(result.success).toBe(false);
  });

  it("lehnt Kommazahlen und fehlende Klassen ab", () => {
    expect(projectSchema.safeParse({ ...validProject, studentCount: 2.5 }).success).toBe(false);
    expect(projectSchema.safeParse({ ...validProject, schoolClassIds: [] }).success).toBe(false);
  });

  it("macht aus der Bild-URL die Bild-ID und lehnt fremde URLs ab", () => {
    expect(projectSchema.parse({ ...validProject, bannerImage: "/api/images/abc123" }).bannerImage).toBe("abc123");
    expect(projectSchema.parse({ ...validProject, bannerImage: null }).bannerImage).toBeNull();
    expect(projectSchema.safeParse({ ...validProject, bannerImage: "https://evil.example/pixel.png" }).success).toBe(false);
    expect(projectSchema.safeParse({ ...validProject, bannerImage: "data:image/png;base64,AAAA" }).success).toBe(false);
  });
});

describe("weitere Schemas", () => {
  it("groupSchema verlangt positive ganze Plätze", () => {
    expect(groupSchema.safeParse({ name: "A", description: "B", maxStudents: 0 }).success).toBe(false);
    expect(groupSchema.safeParse({ name: "A", description: "B", maxStudents: 5 }).success).toBe(true);
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
    expect(priorityRankSchema.safeParse({ groupId: "g", priority: "abc" }).success).toBe(false);
    expect(priorityRankSchema.safeParse({ groupId: "g", priority: 1.5 }).success).toBe(false);
    expect(priorityRankSchema.safeParse({ groupId: "g", priority: 0 }).success).toBe(false);
    expect(priorityRankSchema.safeParse({ groupId: "g", priority: 2 }).success).toBe(true);
  });
});

describe("deutsche Fehlermeldungen", () => {
  const firstMessage = (r: { success: boolean; error?: { issues: { message: string }[] } }) => r.error?.issues[0]?.message;

  it("bei ungültiger Zahl", () => {
    expect(firstMessage(groupSchema.safeParse({ name: "G", description: "d", maxStudents: "abc" }))).toBe(
      "Maximale Schüleranzahl muss eine Zahl sein."
    );
  });

  it("bei ungültigem Datum", () => {
    expect(firstMessage(projectSchema.safeParse({ ...validProject, startDate: "kein-datum" }))).toBe(
      "Start: ungültiges Datum."
    );
  });

  it("bei Passwort, das kein Text ist", () => {
    expect(firstMessage(passwordSchema.safeParse({ password: 12345678 }))).toBe("Passwort muss ein Text sein.");
  });
});
