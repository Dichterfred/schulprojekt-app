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

describe("findMaxPrioR", () => {
    describe("liefert die minimale Priorität, bei der alle Schüler einen Platz bekommen", () => {
        it.each([
            ["testData_R1", testData_R1, 4, 5, 1],
            ["testData_R2", testData_R2, 4, 5, 2],
            ["testData_R3", testData_R3, 4, 5, 3],
            ["testData_R4", testData_R4, 4, 5, 4],
            ["testData_R3_small", testData_R3_small, 3, 4, 3],
            ["groupPreferenceListsTestData", groupPreferenceListsTestData, 4, 5, 2],
        ])("%s → R = %i", (_name, students, groupCount, capacity, expected) => {
            expect(findMaxPrioR(students, createGroups(groupCount, capacity))).toBe(expected);
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
                expect(findMaxPrioR(shuffled, createGroups(groupCount, capacity))).toBe(expected);
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
        expect(findMaxPrioR(students, createGroups(2, 1))).toBe(1);
    });

    it("findet R = 2 nur durch Umverteilen (Verdrängen) eines bereits platzierten Schülers", () => {
        // Alle wollen group-1 (Kapazität 1). s1 sitzt zuerst dort; s2 und s3 kommen nur rein,
        // wenn bereits platzierte Schüler auf ihre Zweitwahl (group-2 bzw. group-3) verschoben werden.
        const students: studentPreferenceList[] = [
            {studentid: "s1", projectid: "p", prefList: [{groupId: "group-1", preference: 1}, {groupId: "group-2", preference: 2}, {groupId: "group-3", preference: 3}]},
            {studentid: "s2", projectid: "p", prefList: [{groupId: "group-1", preference: 1}, {groupId: "group-3", preference: 2}, {groupId: "group-2", preference: 3}]},
            {studentid: "s3", projectid: "p", prefList: [{groupId: "group-1", preference: 1}, {groupId: "group-2", preference: 2}, {groupId: "group-3", preference: 3}]},
        ];
        expect(findMaxPrioR(students, createGroups(3, 1))).toBe(2);
    });

    it("liefert 1 bei einer leeren Schülerliste", () => {
        expect(findMaxPrioR([], createGroups(3, 2))).toBe(1);
    });
});

const s = (id: string, prefs: [string, number][]): studentPreferenceList =>
    ({studentid: id, projectid: "p", prefList: prefs.map(([groupId, preference]) => ({groupId, preference}))});

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
