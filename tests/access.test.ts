import { describe, expect, it } from "vitest";
import {
  canManageProjectDays,
  invalidExcludedClassIds,
  isStudentSessionValid,
  projectAccessFilter,
  studentVisibleProjectsWhere,
} from "@/lib/access";

describe("canManageProjectDays", () => {
  it("erlaubt nur Superuser", () => {
    expect(canManageProjectDays({ id: "s", role: "SUPERUSER" })).toBe(true);
    expect(canManageProjectDays({ id: "t", role: "TEACHER" })).toBe(false);
    expect(canManageProjectDays({ id: "x", role: "STUDENT" })).toBe(false);
  });
});

describe("projectAccessFilter", () => {
  it("filtert Lehrkräfte auf eigene Projekte", () => {
    expect(projectAccessFilter({ id: "t", role: "TEACHER" })).toEqual({ ownerId: "t" });
  });
  it("lässt Superuser alles sehen", () => {
    expect(projectAccessFilter({ id: "s", role: "SUPERUSER" })).toEqual({});
  });
});

describe("studentVisibleProjectsWhere", () => {
  it("schließt ausgeschlossene Klassen aus", () => {
    expect(studentVisibleProjectsWhere("d1", "c1")).toEqual({
      projectDayId: "d1",
      excludedClasses: { none: { id: "c1" } },
    });
  });
});

describe("invalidExcludedClassIds", () => {
  it("liefert Ids, die nicht am Tag teilnehmen", () => {
    expect(invalidExcludedClassIds(["a", "x"], ["a", "b"])).toEqual(["x"]);
    expect(invalidExcludedClassIds([], ["a"])).toEqual([]);
  });
});

describe("isStudentSessionValid", () => {
  const s = { sessionVersion: 2, schoolClassId: "a" };
  it("lehnt null ab", () => {
    expect(isStudentSessionValid(null, 2, ["a"])).toBe(false);
  });
  it("lehnt abweichende Version ab", () => {
    expect(isStudentSessionValid(s, 1, ["a"])).toBe(false);
  });
  it("lehnt Klasse außerhalb des Tags ab", () => {
    expect(isStudentSessionValid(s, 2, ["b"])).toBe(false);
  });
  it("akzeptiert sonst", () => {
    expect(isStudentSessionValid(s, 2, ["a", "b"])).toBe(true);
  });
});
