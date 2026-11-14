import {describe, expect, it} from "vitest";
import {assignWithinR, findMaxPrioR, studentPreferenceList} from "../group-registration/groupRegistration";
import {
    createGroups,
    groupPreferenceListsTestData,
    testData_R1,
    testData_R2,
    testData_R3,
    testData_R3_small,
    testData_R4,
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

const s = (id: string, prefs: [string, number][]): studentPreferenceList =>
    ({studentid: id, projectid: "p", prefList: prefs.map(([groupId, preference]) => ({groupId, preference}))});

/** 30 Schüler, die alle nur 3 von group-1..group-4 wählen; Erstwahl reihum verteilt. */
const popularGroupsStudents = Array.from({length: 30}, (_, i) =>
    s(`student-${i + 1}`, [0, 1, 2].map(k => [`group-${((i + k) % 4) + 1}`, k + 1] as [string, number])));

describe("findMaxPrioR", () => {
    describe("liefert die minimale Priorität, bei der alle Schüler einen Platz bekommen", () => {
        it.each([
            ["testData_R1", 1, testData_R1, 4, 5],
            ["testData_R2", 2, testData_R2, 4, 5],
            ["testData_R3", 3, testData_R3, 4, 5],
            ["testData_R4", 4, testData_R4, 4, 5],
            ["testData_R3_small", 3, testData_R3_small, 3, 4],
            ["groupPreferenceListsTestData", 2, groupPreferenceListsTestData, 4, 5],
        ])("%s → R = %i", (_name, expected, students, groupCount, capacity) => {
            expect(findMaxPrioR(students, createGroups(groupCount, capacity))).toEqual({maxPrio: expected, unassigned: []});
        });
    });

    it("ist unabhängig von der Reihenfolge der Schüler", () => {
        const datasets: [studentPreferenceList[], number, number, number][] = [
            [testData_R1, 4, 5, 1],
            [testData_R2, 4, 5, 2],
            [testData_R3, 4, 5, 3],
            [testData_R4, 4, 5, 4],
            [testData_R3_small, 3, 4, 3],
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
        findMaxPrioR(testData_R3, groups);
        expect(groups).toEqual(before);
    });

    it("liefert 1, wenn jeder Schüler seine Erstwahl bekommen kann", () => {
        const students: studentPreferenceList[] = [
            {studentid: "s1", projectid: "p", prefList: [{groupId: "group-1", preference: 1}, {groupId: "group-2", preference: 2}]},
            {studentid: "s2", projectid: "p", prefList: [{groupId: "group-1", preference: 2}, {groupId: "group-2", preference: 1}]},
        ];
        expect(findMaxPrioR(students, createGroups(2, 1)).maxPrio).toBe(1);
    });

    it("findet R = 2 nur durch Umverteilen (Verdrängen) eines bereits platzierten Schülers", () => {
        // Alle wollen group-1 (Kapazität 1). s1 sitzt zuerst dort; s2 und s3 kommen nur rein,
        // wenn bereits platzierte Schüler auf ihre Zweitwahl (group-2 bzw. group-3) verschoben werden.
        const students: studentPreferenceList[] = [
            {studentid: "s1", projectid: "p", prefList: [{groupId: "group-1", preference: 1}, {groupId: "group-2", preference: 2}, {groupId: "group-3", preference: 3}]},
            {studentid: "s2", projectid: "p", prefList: [{groupId: "group-1", preference: 1}, {groupId: "group-3", preference: 2}, {groupId: "group-2", preference: 3}]},
            {studentid: "s3", projectid: "p", prefList: [{groupId: "group-1", preference: 1}, {groupId: "group-2", preference: 2}, {groupId: "group-3", preference: 3}]},
        ];
        expect(findMaxPrioR(students, createGroups(3, 1)).maxPrio).toBe(2);
    });

    it("liefert 1 bei einer leeren Schülerliste", () => {
        expect(findMaxPrioR([], createGroups(3, 2))).toEqual({maxPrio: 1, unassigned: []});
    });

    it("kommt mit Lücken in den Prioritäten zurecht", () => {
        // s1 hat nur Prio 1 und 3; erst bei R = 3 passen beide
        expect(findMaxPrioR([s("s1", [["group-1", 1], ["group-2", 3]]), s("s2", [["group-1", 1]])], createGroups(2, 1)))
            .toEqual({maxPrio: 3, unassigned: []});
    });

    it("wählt das kleinste R, das schon die meisten unterbringt", () => {
        // max. 2 von 3 unterbringbar (group-3 wählt niemand); das gelingt ab R = 2
        const r = findMaxPrioR([
            s("s1", [["group-1", 1]]),
            s("s2", [["group-1", 1], ["group-2", 2]]),
            s("s3", [["group-1", 1], ["group-2", 2]]),
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
        expect(findMaxPrioR([s("s1", []), s("s2", [["group-1", 1]])], createGroups(2, 1)))
            .toEqual({maxPrio: 1, unassigned: ["s1"]});
    });
});

describe("assignWithinR", () => {
    it("teilt nur Gruppen bis Priorität R zu", () => {
        const r = assignWithinR([s("s1", [["group-1", 1], ["group-2", 2]]), s("s2", [["group-1", 1], ["group-2", 2]])], createGroups(2, 1), 1);
        expect(r.unassigned).toEqual(["s2"]);
        expect(r.groups[0].students.map(x => x.studentId)).toEqual(["s1"]);
        expect(r.groups[1].students).toEqual([]);
    });

    it("hält die Kapazität ein und setzt full", () => {
        const r = assignWithinR(testData_R4, createGroups(4, 5), 4);
        expect(r.unassigned).toEqual([]);
        for (const g of r.groups) {
            expect(g.students).toHaveLength(5);
            expect(g.full).toBe(true);
        }
    });

    it("verschiebt bereits platzierte Schüler über eine Kette", () => {
        // alle wollen group-1; s2/s3 kommen nur rein, wenn Vorgänger auf ihre Zweitwahl ausweichen
        const r = assignWithinR([
            s("s1", [["group-1", 1], ["group-2", 2], ["group-3", 3]]),
            s("s2", [["group-1", 1], ["group-3", 2], ["group-2", 3]]),
            s("s3", [["group-1", 1], ["group-2", 2], ["group-3", 3]]),
        ], createGroups(3, 1), 2);
        expect(r.unassigned).toEqual([]);
        expect(r.groups.every(g => g.students.length === 1)).toBe(true);
        for (const g of r.groups) expect(g.students[0].preference).toBeLessThanOrEqual(2);
    });

    it("verändert weder Gruppen noch Schüler der Eingabe", () => {
        const groups = createGroups(4, 5);
        const unsorted = testData_R3.map(st => ({...st, prefList: [...st.prefList].reverse()}));
        const before = structuredClone(unsorted);
        assignWithinR(unsorted, groups, 3);
        expect(groups).toEqual(createGroups(4, 5));
        expect(unsorted).toEqual(before);
    });

    it("ignoriert unbekannte groupIds", () => {
        const r = assignWithinR([s("s1", [["gibt-es-nicht", 1], ["group-1", 2]])], createGroups(1, 1), 2);
        expect(r.unassigned).toEqual([]);
        expect(r.groups[0].students[0]).toEqual({studentId: "s1", preference: 2});
    });

    it("verschiebt keine vorab eingetragenen Schüler außerhalb der Liste", () => {
        const groups = createGroups(2, 1);
        groups[0].students = [{studentId: "fest", preference: 1}];
        groups[0].full = true;
        const r = assignWithinR([s("s1", [["group-1", 1]])], groups, 1);
        expect(r.unassigned).toEqual(["s1"]);
        expect(r.groups[0].students).toEqual([{studentId: "fest", preference: 1}]);
    });

    it("arbeitet unsortierte prefLists nach Priorität ab", () => {
        const r = assignWithinR([s("s1", [["group-2", 3], ["group-1", 1]])], createGroups(2, 1), 3);
        expect(r.groups[0].students[0]).toEqual({studentId: "s1", preference: 1});
    });
});
