import { describe, expect, it } from "vitest";
import type { Prisma } from "@prisma/client";
import { pruneInvalidPreferences } from "@/lib/preferencesMaintenance";

type Pref = { id: string; rank: number; studentId: string; projectDayId: string; projectId: string };
type Call = { op: string; id?: string; rank?: number };

/** Simuliert die benötigten Prisma-Aufrufe inkl. @@unique([studentId, projectDayId, rank]). */
function mockTx(opts: {
  prefs: Pref[];
  studentClass: Record<string, string>;
  excluded: Record<string, string[]>;
  dayClasses: Record<string, string[]>;
}) {
  const prefs = opts.prefs.map((p) => ({ ...p }));
  const calls: Call[] = [];

  const assertFree = (p: Pref, rank: number) => {
    const clash = prefs.find(
      (o) => o.id !== p.id && o.studentId === p.studentId && o.projectDayId === p.projectDayId && o.rank === rank,
    );
    if (clash) throw new Error(`Unique-Verletzung: Rang ${rank} gehört noch ${clash.id}`);
  };

  const tx = {
    preference: {
      findMany: async ({ where }: { where: { projectDayId?: string; studentId?: { in: string[] } } }) =>
        prefs
          .filter((p) => (where.projectDayId ? p.projectDayId === where.projectDayId : true))
          .filter((p) => (where.studentId ? where.studentId.in.includes(p.studentId) : true))
          .map((p) => ({ ...p, student: { schoolClassId: opts.studentClass[p.studentId] } })),
      deleteMany: async ({ where }: { where: { id: { in: string[] } } }) => {
        calls.push({ op: "deleteMany" });
        for (const id of where.id.in) prefs.splice(prefs.findIndex((p) => p.id === id), 1);
        return { count: where.id.in.length };
      },
      update: async ({ where, data }: { where: { id: string }; data: { rank: number } }) => {
        const p = prefs.find((x) => x.id === where.id)!;
        calls.push({ op: "update", id: p.id, rank: data.rank });
        assertFree(p, data.rank);
        p.rank = data.rank;
        return p;
      },
    },
    project: {
      findMany: async ({ where }: { where: { id: { in: string[] } } }) =>
        where.id.in.map((id) => ({ id, excludedClasses: (opts.excluded[id] ?? []).map((c) => ({ id: c })) })),
    },
    projectDay: {
      findMany: async ({ where }: { where: { id: { in: string[] } } }) =>
        where.id.in.map((id) => ({ id, schoolClasses: (opts.dayClasses[id] ?? []).map((c) => ({ id: c })) })),
    },
  };
  return { tx: tx as unknown as Prisma.TransactionClient, prefs, calls };
}

describe("pruneInvalidPreferences", () => {
  it("verdichtet [1,3,4] → [1,2,3] in zwei Phasen ohne Rang-Kollision", async () => {
    const { tx, prefs, calls } = mockTx({
      prefs: [
        { id: "a", rank: 1, studentId: "s", projectDayId: "d", projectId: "p1" },
        { id: "b", rank: 3, studentId: "s", projectDayId: "d", projectId: "p3" },
        { id: "c", rank: 4, studentId: "s", projectDayId: "d", projectId: "p4" },
      ],
      studentClass: { s: "k1" },
      excluded: {},
      dayClasses: { d: ["k1"] },
    });

    await pruneInvalidPreferences(tx, { projectDayId: "d" });

    const updates = calls.filter((c) => c.op === "update");
    // Phase 1: alle betroffenen über 10000, Phase 2: Zielränge
    expect(updates.map((u) => u.rank! > 10000)).toEqual([true, true, false, false]);
    expect(updates.slice(2)).toEqual([
      { op: "update", id: "b", rank: 2 },
      { op: "update", id: "c", rank: 3 },
    ]);
    expect(prefs.map((p) => [p.id, p.rank])).toEqual([
      ["a", 1],
      ["b", 2],
      ["c", 3],
    ]);
  });

  it("vertauschende Ränge kollidieren nicht (Ziel eines Datensatzes ist Startrang eines anderen)", async () => {
    // Nach Löschen von Rang 1: [2,3] → [1,2]; 'c' will Rang 2, den 'b' noch hält
    const { tx, prefs } = mockTx({
      prefs: [
        { id: "x", rank: 1, studentId: "s", projectDayId: "d", projectId: "px" },
        { id: "b", rank: 2, studentId: "s", projectDayId: "d", projectId: "p2" },
        { id: "c", rank: 3, studentId: "s", projectDayId: "d", projectId: "p3" },
      ],
      studentClass: { s: "k1" },
      excluded: { px: ["k1"] },
      dayClasses: { d: ["k1"] },
    });

    await pruneInvalidPreferences(tx, { projectDayId: "d" });

    expect(prefs.map((p) => [p.id, p.rank])).toEqual([
      ["b", 1],
      ["c", 2],
    ]);
  });

  it("löscht Prioritäten, deren Projekt die Klasse ausschließt oder deren Tag die Klasse nicht mehr enthält", async () => {
    const { tx, prefs } = mockTx({
      prefs: [
        { id: "ok", rank: 2, studentId: "s1", projectDayId: "d", projectId: "p1" },
        { id: "excl", rank: 1, studentId: "s1", projectDayId: "d", projectId: "p2" },
        { id: "gone", rank: 1, studentId: "s2", projectDayId: "d", projectId: "p1" },
      ],
      studentClass: { s1: "k1", s2: "k2" },
      excluded: { p2: ["k1"] },
      dayClasses: { d: ["k1"] },
    });

    await pruneInvalidPreferences(tx, { studentIds: ["s1", "s2"] });

    expect(prefs.map((p) => [p.id, p.rank])).toEqual([["ok", 1]]);
  });

  it("tut nichts, wenn alles gültig und lückenlos ist", async () => {
    const { tx, calls } = mockTx({
      prefs: [
        { id: "a", rank: 1, studentId: "s", projectDayId: "d", projectId: "p1" },
        { id: "b", rank: 2, studentId: "s", projectDayId: "d", projectId: "p2" },
      ],
      studentClass: { s: "k1" },
      excluded: {},
      dayClasses: { d: ["k1"] },
    });

    await pruneInvalidPreferences(tx, { projectDayId: "d" });

    expect(calls).toEqual([]);
  });
});
