import { describe, expect, it } from "vitest";
import {
  projectDayFormToBody,
  projectDayToForm,
  projectFormToBody,
  projectToForm,
  excludedClassesLabel,
  importIssueLabel,
  importSummary,
  studentsPdfBody,
  fileNameFromDisposition,
  studentFormToBody,
} from "@/lib/forms";
import {
  projectDaySchema,
  projectCreateSchema,
  projectUpdateSchema,
  studentCreateSchema,
  studentUpdateSchema,
  studentsPdfRequestSchema,
} from "@/lib/validation";

const class5a = { id: "c1", name: "5a", sortOrder: 1 };
const class5b = { id: "c2", name: "5b", sortOrder: 2 };

const dayForm = {
  name: "Projekttage 2026",
  description: "Beschreibung",
  bannerImage: null,
  schoolClassIds: ["c1", "c2"],
  startDate: "2026-07-20",
  endDate: "2026-07-22",
  enrollmentDeadline: "2026-07-10T12:00",
};

describe("projectDayFormToBody", () => {
  it("liefert den vollständigen Body inkl. aller Pflichtfelder (für POST und PATCH)", () => {
    const body = projectDayFormToBody(dayForm);
    expect(body).toEqual({
      name: "Projekttage 2026",
      description: "Beschreibung",
      bannerImage: null,
      schoolClassIds: ["c1", "c2"],
      startDate: "2026-07-20T00:00:00.000Z",
      endDate: "2026-07-22T23:59:59.999Z",
      enrollmentDeadline: new Date("2026-07-10T12:00").toISOString(),
    });
    expect(projectDaySchema.safeParse(body).success).toBe(true);
  });

  it("überträgt den Projekttag zurück in die Formularwerte (Round-Trip)", () => {
    const body = projectDayFormToBody({ ...dayForm, bannerImage: "/api/images/abc" });
    const form = projectDayToForm({
      ...body,
      schoolClasses: [class5a, class5b],
    });
    expect(form).toEqual({ ...dayForm, bannerImage: "/api/images/abc" });
  });
});

const projectForm = {
  name: "Robotik",
  description: "Bauen",
  bannerImage: null,
  maxStudents: "12",
  excludedClassIds: ["c1"],
  assignedOwnerId: "",
};

describe("projectFormToBody", () => {
  it("sendet für Lehrer keinen Owner", () => {
    const body = projectFormToBody(projectForm, false);
    expect(body).toEqual({ name: "Robotik", description: "Bauen", bannerImage: null, maxStudents: 12, excludedClassIds: ["c1"] });
    expect(projectUpdateSchema.safeParse(body).success).toBe(true);
    expect(projectCreateSchema.safeParse({ ...body, projectDayId: "d1" }).success).toBe(true);
  });

  it("sendet für den Super User den gewählten Lehrer oder null", () => {
    expect(projectFormToBody({ ...projectForm, assignedOwnerId: "t1" }, true).assignedOwnerId).toBe("t1");
    expect(projectFormToBody(projectForm, true).assignedOwnerId).toBeNull();
  });

  it("Super-User-Bodies (Owner null oder ID) sind für POST und PATCH gültig", () => {
    for (const assignedOwnerId of ["", "t1"]) {
      const body = projectFormToBody({ ...projectForm, assignedOwnerId }, true);
      expect(body.assignedOwnerId).toBe(assignedOwnerId || null);
      const update = projectUpdateSchema.safeParse(body);
      expect(update.success).toBe(true);
      expect(update.data?.assignedOwnerId).toBe(assignedOwnerId || null);
      const create = projectCreateSchema.safeParse({ ...body, projectDayId: "d1" });
      expect(create.success).toBe(true);
      expect(create.data?.assignedOwnerId).toBe(assignedOwnerId || null);
    }
  });

  it("überträgt ein Projekt in die Formularwerte", () => {
    expect(
      projectToForm({
        name: "Robotik", description: "Bauen", bannerImage: null, maxStudents: 12, ownerId: null,
        excludedClasses: [class5a],
      }),
    ).toEqual(projectForm);
  });
});

describe("excludedClassesLabel", () => {
  it("listet ausgeschlossene Klassen oder nichts", () => {
    expect(excludedClassesLabel([{ name: "5a" }, { name: "5b" }])).toBe("ohne: 5a, 5b");
    expect(excludedClassesLabel([])).toBe("");
  });
});

describe("importIssueLabel", () => {
  it("nennt die Zeilennummer bei Zeilenfehlern", () => {
    expect(importIssueLabel({ row: 3, message: "Vorname fehlt." })).toBe("Zeile 3: Vorname fehlt.");
  });

  it("zeigt Fehler der ganzen Datei (Zeile 0) ohne Zeilennummer", () => {
    expect(importIssueLabel({ row: 0, message: "Die Datei ist keine gültige Excel-Datei." })).toBe(
      "Die Datei ist keine gültige Excel-Datei.",
    );
  });
});

describe("importSummary", () => {
  it("fasst angelegte und übersprungene Schüler zusammen", () => {
    expect(importSummary({ created: 3, skipped: [{ row: 4, message: "x" }] })).toBe("3 angelegt, 1 übersprungen");
    expect(importSummary({ created: 0, skipped: [] })).toBe("0 angelegt, 0 übersprungen");
  });
});

describe("studentsPdfBody", () => {
  it("leere Auswahl bedeutet alle Klassen", () => {
    expect(studentsPdfBody("")).toEqual({});
    expect(studentsPdfRequestSchema.safeParse(studentsPdfBody("")).success).toBe(true);
  });

  it("sendet die gewählte Klasse", () => {
    expect(studentsPdfBody("c1")).toEqual({ classId: "c1" });
    expect(studentsPdfRequestSchema.safeParse(studentsPdfBody("c1")).success).toBe(true);
  });
});

describe("fileNameFromDisposition", () => {
  it("liest den Dateinamen aus dem Header", () => {
    expect(fileNameFromDisposition('attachment; filename="zugangsdaten-5a.pdf"', "x.pdf")).toBe("zugangsdaten-5a.pdf");
    expect(fileNameFromDisposition("attachment; filename=zugangsdaten-alle.pdf", "x.pdf")).toBe("zugangsdaten-alle.pdf");
  });

  it("nutzt den Fallback ohne Header oder Dateinamen", () => {
    expect(fileNameFromDisposition(null, "zugangsdaten.pdf")).toBe("zugangsdaten.pdf");
    expect(fileNameFromDisposition("attachment", "zugangsdaten.pdf")).toBe("zugangsdaten.pdf");
  });

  it("entfernt Pfadanteile aus dem Dateinamen", () => {
    expect(fileNameFromDisposition('attachment; filename="../../evil.pdf"', "x.pdf")).toBe("evil.pdf");
  });
});

describe("studentFormToBody", () => {
  it("übernimmt Vorname, Nachname und Klasse (getrimmt) und passt zum Schema", () => {
    const body = studentFormToBody({ firstName: " Anna Maria ", lastName: "von Berg", schoolClassId: "c1" });
    expect(body).toEqual({ firstName: "Anna Maria", lastName: "von Berg", schoolClassId: "c1" });
    expect(studentCreateSchema.safeParse(body).success).toBe(true);
    expect(studentUpdateSchema.safeParse(body).success).toBe(true);
  });
});
