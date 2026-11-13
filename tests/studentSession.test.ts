import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  student: { findUnique: vi.fn() },
  projectDay: { findUnique: vi.fn() },
}));
const requireRoleMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  requireRole: requireRoleMock,
}));

import { ApiError } from "@/lib/api";
import { requireStudent } from "@/lib/studentSession";

const DEADLINE = new Date("2026-11-20T12:00:00Z");

function sessionWith(user: Record<string, unknown>) {
  requireRoleMock.mockResolvedValue({ user: { id: "stud1", role: "STUDENT", ...user }, expires: "" });
}

beforeEach(() => {
  requireRoleMock.mockReset();
  prismaMock.student.findUnique.mockReset();
  prismaMock.projectDay.findUnique.mockReset();
  sessionWith({ projectDayId: "day1", sessionVersion: 2 });
  prismaMock.student.findUnique.mockResolvedValue({ sessionVersion: 2, schoolClassId: "class5a" });
  prismaMock.projectDay.findUnique.mockResolvedValue({
    id: "day1",
    name: "Projekttag",
    description: "Beschreibung",
    imageId: "img1",
    enrollmentDeadline: DEADLINE,
    schoolClasses: [{ id: "class5a" }, { id: "class5b" }],
  });
});

async function expectExpired() {
  const err = await requireStudent().catch((e: unknown) => e);
  expect(err).toBeInstanceOf(ApiError);
  expect(err).toMatchObject({ status: 401, message: "Sitzung abgelaufen. Bitte neu anmelden." });
}

describe("requireStudent", () => {
  it("liefert Schüler, Klasse und Projekttag bei gültiger Session", async () => {
    await expect(requireStudent()).resolves.toEqual({
      studentId: "stud1",
      schoolClassId: "class5a",
      projectDay: {
        id: "day1",
        name: "Projekttag",
        description: "Beschreibung",
        imageId: "img1",
        enrollmentDeadline: DEADLINE,
      },
    });
    expect(requireRoleMock).toHaveBeenCalledWith("STUDENT");
  });

  it("401 ohne projectDayId im Token", async () => {
    sessionWith({ sessionVersion: 2 });
    await expectExpired();
  });

  it("401 ohne sessionVersion im Token", async () => {
    sessionWith({ projectDayId: "day1" });
    await expectExpired();
  });

  it("401, wenn der Schüler gelöscht wurde", async () => {
    prismaMock.student.findUnique.mockResolvedValue(null);
    await expectExpired();
  });

  it("401, wenn der Projekttag gelöscht wurde", async () => {
    prismaMock.projectDay.findUnique.mockResolvedValue(null);
    await expectExpired();
  });

  it("401 bei abweichender sessionVersion", async () => {
    prismaMock.student.findUnique.mockResolvedValue({ sessionVersion: 3, schoolClassId: "class5a" });
    await expectExpired();
  });

  it("401, wenn die Klasse nicht mehr zum Projekttag gehört", async () => {
    prismaMock.student.findUnique.mockResolvedValue({ sessionVersion: 2, schoolClassId: "class7a" });
    await expectExpired();
  });

  it("reicht Fehler von requireRole unverändert durch", async () => {
    requireRoleMock.mockRejectedValue(new ApiError(403, "Keine Berechtigung."));
    await expect(requireStudent()).rejects.toMatchObject({ status: 403 });
  });
});
