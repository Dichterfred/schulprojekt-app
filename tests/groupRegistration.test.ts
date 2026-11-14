import {describe, expect, it} from "vitest";
import {assignWithinR, findMaxPrioR, registrationAlgorithm, shuffle, StudentChoices} from "../group-registration/groupRegistration";
import {
    createGroups,
    studentsMixedR2,
    studentsR1,
    studentsR2,
    studentsR3,
    studentsR3Small,
    studentsR4,
} from "./testData/groupRegistrationTestData";

/** Deterministischer Shuffle (Seed), damit fehlschlagende Tests reproduzierbar sind. */
function seededShuffle<T>(array: T[], seed: number): T[] {
    const result = [...array];
    let state = seed;
    const random = () => {
        state = (state * 1103515245 + 12345) % 2 ** 31;
        return state / 2 ** 31;
    };
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/** Kurzschreibweise: studentWith("s1", [["group-1", 1], ["group-2", 2]]) */
const studentWith = (id: string, choices: [string, number][]): StudentChoices =>
    ({studentId: id, projectId: "p", choices: choices.map(([groupId, priority]) => ({groupId, priority}))});

/** 30 Schüler, die alle nur 3 von group-1..group-4 wählen; Erstwahl reihum verteilt. */
const popularGroupsStudents = Array.from({length: 30}, (_, i) =>
    studentWith(`student-${i + 1}`, [0, 1, 2].map(k => [`group-${((i + k) % 4) + 1}`, k + 1] as [string, number])));

describe("findMaxPrioR", () => {
    describe("liefert die minimale Priorität, bei der alle Schüler einen Platz bekommen", () => {
        it.each([
            ["studentsR1", 1, studentsR1, 4, 5],
            ["studentsR2", 2, studentsR2, 4, 5],
            ["studentsR3", 3, studentsR3, 4, 5],
            ["studentsR4", 4, studentsR4, 4, 5],
            ["studentsR3Small", 3, studentsR3Small, 3, 4],
            ["studentsMixedR2", 2, studentsMixedR2, 4, 5],
        ])("%s → R = %i", (_name, expected, students, groupCount, capacity) => {
            expect(findMaxPrioR(students, createGroups(groupCount, capacity))).toEqual({maxPrio: expected, unassigned: []});
        });
    });

    it("ist unabhängig von der Reihenfolge der Schüler", () => {
        const datasets: [StudentChoices[], number, number, number][] = [
            [studentsR1, 4, 5, 1],
            [studentsR2, 4, 5, 2],
            [studentsR3, 4, 5, 3],
            [studentsR4, 4, 5, 4],
            [studentsR3Small, 3, 4, 3],
        ];
        for (const [students, groupCount, capacity, expected] of datasets) {
            for (let seed = 1; seed <= 20; seed++) {
                const shuffled = seededShuffle(students, seed);
                expect(findMaxPrioR(shuffled, createGroups(groupCount, capacity)).maxPrio).toBe(expected);
            }
        }
    });

    it("verändert die übergebenen Gruppen nicht", () => {
        const groups = createGroups(4, 5);
        const before = structuredClone(groups);
        findMaxPrioR(studentsR3, groups);
        expect(groups).toEqual(before);
    });

    it("liefert 1, wenn jeder Schüler seine Erstwahl bekommen kann", () => {
        const students: StudentChoices[] = [
            {studentId: "s1", projectId: "p", choices: [{groupId: "group-1", priority: 1}, {groupId: "group-2", priority: 2}]},
            {studentId: "s2", projectId: "p", choices: [{groupId: "group-1", priority: 2}, {groupId: "group-2", priority: 1}]},
        ];
        expect(findMaxPrioR(students, createGroups(2, 1)).maxPrio).toBe(1);
    });

    it("findet R = 2 nur durch Umverteilen (Verdrängen) eines bereits platzierten Schülers", () => {
        // Alle wollen group-1 (Kapazität 1). s1 sitzt zuerst dort; s2 und s3 kommen nur rein,
        // wenn bereits platzierte Schüler auf ihre Zweitwahl (group-2 bzw. group-3) verschoben werden.
        const students: StudentChoices[] = [
            {studentId: "s1", projectId: "p", choices: [{groupId: "group-1", priority: 1}, {groupId: "group-2", priority: 2}, {groupId: "group-3", priority: 3}]},
            {studentId: "s2", projectId: "p", choices: [{groupId: "group-1", priority: 1}, {groupId: "group-3", priority: 2}, {groupId: "group-2", priority: 3}]},
            {studentId: "s3", projectId: "p", choices: [{groupId: "group-1", priority: 1}, {groupId: "group-2", priority: 2}, {groupId: "group-3", priority: 3}]},
        ];
        expect(findMaxPrioR(students, createGroups(3, 1)).maxPrio).toBe(2);
    });

    it("liefert 1 bei einer leeren Schülerliste", () => {
        expect(findMaxPrioR([], createGroups(3, 2))).toEqual({maxPrio: 1, unassigned: []});
    });

    it("kommt mit Lücken in den Prioritäten zurecht", () => {
        // s1 hat nur Prio 1 und 3; erst bei R = 3 passen beide
        expect(findMaxPrioR([studentWith("s1", [["group-1", 1], ["group-2", 3]]), studentWith("s2", [["group-1", 1]])], createGroups(2, 1)))
            .toEqual({maxPrio: 3, unassigned: []});
    });

    it("wählt das kleinste R, das schon die meisten unterbringt", () => {
        // max. 2 von 3 unterbringbar (group-3 wählt niemand); das gelingt ab R = 2
        const r = findMaxPrioR([
            studentWith("s1", [["group-1", 1]]),
            studentWith("s2", [["group-1", 1], ["group-2", 2]]),
            studentWith("s3", [["group-1", 1], ["group-2", 2]]),
        ], createGroups(3, 1));
        expect(r.maxPrio).toBe(2);
        expect(r.unassigned).toHaveLength(1);
    });

    it("meldet 18 nicht unterbringbare Schüler, wenn alle dieselben 4 Gruppen wählen", () => {
        // 10 Gruppen à 3 Plätze = 30 Plätze, aber group-1..4 haben zusammen nur 12
        const r = findMaxPrioR(popularGroupsStudents, createGroups(10, 3));
        expect(r.unassigned).toHaveLength(18);
        expect(r.maxPrio).toBe(1);
    });

    it("Anzahl nicht Untergebrachter hängt nicht von der Reihenfolge ab", () => {
        for (let seed = 1; seed <= 10; seed++) {
            const r = findMaxPrioR(seededShuffle(popularGroupsStudents, seed), createGroups(10, 3));
            expect(r.unassigned).toHaveLength(18);
        }
    });

    it("setzt Schüler ohne Prioritäten auf unassigned", () => {
        expect(findMaxPrioR([studentWith("s1", []), studentWith("s2", [["group-1", 1]])], createGroups(2, 1)))
            .toEqual({maxPrio: 1, unassigned: ["s1"]});
    });
});

describe("assignWithinR", () => {
    it("teilt nur Gruppen bis Priorität R zu", () => {
        const r = assignWithinR([studentWith("s1", [["group-1", 1], ["group-2", 2]]), studentWith("s2", [["group-1", 1], ["group-2", 2]])], createGroups(2, 1), 1);
        expect(r.unassigned).toEqual(["s2"]);
        expect(r.groups[0].members.map(x => x.studentId)).toEqual(["s1"]);
        expect(r.groups[1].members).toEqual([]);
    });

    it("hält die Kapazität ein und setzt full", () => {
        const r = assignWithinR(studentsR4, createGroups(4, 5), 4);
        expect(r.unassigned).toEqual([]);
        for (const g of r.groups) {
            expect(g.members).toHaveLength(5);
            expect(g.full).toBe(true);
        }
    });

    it("verschiebt bereits platzierte Schüler über eine Kette", () => {
        // alle wollen group-1; s2/s3 kommen nur rein, wenn Vorgänger auf ihre Zweitwahl ausweichen
        const r = assignWithinR([
            studentWith("s1", [["group-1", 1], ["group-2", 2], ["group-3", 3]]),
            studentWith("s2", [["group-1", 1], ["group-3", 2], ["group-2", 3]]),
            studentWith("s3", [["group-1", 1], ["group-2", 2], ["group-3", 3]]),
        ], createGroups(3, 1), 2);
        expect(r.unassigned).toEqual([]);
        expect(r.groups.every(g => g.members.length === 1)).toBe(true);
        for (const g of r.groups) expect(g.members[0].priority).toBeLessThanOrEqual(2);
    });

    it("verändert weder Gruppen noch Schüler der Eingabe", () => {
        const groups = createGroups(4, 5);
        const unsorted = studentsR3.map(st => ({...st, choices: [...st.choices].reverse()}));
        const before = structuredClone(unsorted);
        assignWithinR(unsorted, groups, 3);
        expect(groups).toEqual(createGroups(4, 5));
        expect(unsorted).toEqual(before);
    });

    it("ignoriert unbekannte groupIds", () => {
        const r = assignWithinR([studentWith("s1", [["gibt-es-nicht", 1], ["group-1", 2]])], createGroups(1, 1), 2);
        expect(r.unassigned).toEqual([]);
        expect(r.groups[0].members[0]).toEqual({studentId: "s1", priority: 2});
    });

    it("verschiebt keine vorab eingetragenen Schüler außerhalb der Liste", () => {
        const groups = createGroups(2, 1);
        groups[0].members = [{studentId: "fest", priority: 1}];
        groups[0].full = true;
        const r = assignWithinR([studentWith("s1", [["group-1", 1]])], groups, 1);
        expect(r.unassigned).toEqual(["s1"]);
        expect(r.groups[0].members).toEqual([{studentId: "fest", priority: 1}]);
    });

    it("rechnet 'full' selbst aus, statt einem veralteten Flag zu vertrauen", () => {
        const groups = createGroups(2, 1);
        groups[0].members = [{studentId: "fest", priority: 1}]; // full bleibt fälschlich false
        groups[1].capacity = 0;
        const r = assignWithinR([studentWith("s1", [["group-1", 1], ["group-2", 2]])], groups, 2);
        expect(r.unassigned).toEqual(["s1"]);
        expect(r.groups[0].members).toHaveLength(1);
        expect(r.groups[1].members).toHaveLength(0);
    });

    it("arbeitet unsortierte Wahlen nach Priorität ab", () => {
        const r = assignWithinR([studentWith("s1", [["group-2", 3], ["group-1", 1]])], createGroups(2, 1), 3);
        expect(r.groups[0].members[0]).toEqual({studentId: "s1", priority: 1});
    });
});

describe("shuffle", () => {
    it("liefert eine Permutation und verändert die Eingabe nicht", () => {
        const input = [1, 2, 3, 4, 5, 6, 7, 8];
        const result = shuffle(input);
        expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
        expect(result).not.toBe(input);
        expect([...result].sort((a, b) => a - b)).toEqual(input);
    });

    it("erzeugt alle Reihenfolgen gleich häufig", () => {
        const counts = new Map<string, number>();
        const runs = 60000;
        for (let i = 0; i < runs; i++) {
            const key = shuffle(["a", "b", "c"]).join("");
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        expect(counts.size).toBe(6);
        // Erwartung je 10000; Toleranz ±5 % liegt bei > 5 Standardabweichungen
        for (const count of counts.values()) expect(Math.abs(count - runs / 6)).toBeLessThan(500);
    });
});

describe("registrationAlgorithm", () => {
    it("verändert die Reihenfolge der übergebenen Schülerliste nicht", () => {
        const students = structuredClone(studentsR3);
        const ids = students.map(st => st.studentId);
        registrationAlgorithm(students, createGroups(4, 5));
        expect(students.map(st => st.studentId)).toEqual(ids);
    });
});
