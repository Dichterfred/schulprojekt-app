import { describe, expect, it } from "vitest";
import {
  projectDayFormToBody,
  projectDayToForm,
  projectFormToBody,
  projectToForm,
  excludedClassesLabel,
} from "@/lib/forms";
import { projectDaySchema, projectCreateSchema, projectUpdateSchema } from "@/lib/validation";

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
