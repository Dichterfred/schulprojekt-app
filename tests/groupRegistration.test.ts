import {afterEach, describe, expect, it, vi} from "vitest";
import {
    assignWithinR,
    findMaxPrioR,
    optimizeAssignment,
    registrationAlgorithm,
    RegistrationGroup,
    shuffle,
    StudentChoices,
} from "../group-registration/groupRegistration";
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

/** Trägt Mitglieder in Gruppen ein: seat(createGroups(2, 1), {"group-1": [["s1", 2]]}) */
function seat(groups: RegistrationGroup[], members: Record<string, [string, number][]>): RegistrationGroup[] {
    for (const g of groups) {
        g.members = (members[g.groupId] ?? []).map(([studentId, priority]) => ({studentId, priority}))
        g.full = g.members.length >= g.capacity
    }
    return groups
}

/** groupId → sortierte studentIds, zum lesbaren Vergleich von Zuteilungen */
const placement = (groups: RegistrationGroup[]) =>
    Object.fromEntries(groups.map(g => [g.groupId, g.members.map(m => m.studentId).sort()]))

describe("optimizeAssignment", () => {
    it("zieht einen Schüler in einen freien Platz seiner besseren Wahl um", () => {
        const students = [studentWith("s1", [["group-1", 2], ["group-2", 1]])]
        const groups = seat(createGroups(2, 1), {"group-1": [["s1", 2]]})
        const r = optimizeAssignment(students, groups, 2)
        expect(r[1].members).toEqual([{studentId: "s1", priority: 1}])
        expect(r[0].members).toEqual([])
    })

    it("findet einen Ringtausch, obwohl jeder Paartausch schlechter wäre", () => {
        // alle sitzen auf Prio 2 (Summe 12); jeder Paartausch ergibt 14, der Ring 3
        const students = [
            studentWith("s1", [["group-2", 1], ["group-1", 2], ["group-3", 3]]),
            studentWith("s2", [["group-3", 1], ["group-2", 2], ["group-1", 3]]),
            studentWith("s3", [["group-1", 1], ["group-3", 2], ["group-2", 3]]),
        ]
        const groups = seat(createGroups(3, 1), {"group-1": [["s1", 2]], "group-2": [["s2", 2]], "group-3": [["s3", 2]]})
        const r = optimizeAssignment(students, groups, 3)
        expect(placement(r)).toEqual({"group-1": ["s3"], "group-2": ["s1"], "group-3": ["s2"]})
        expect(r.flatMap(g => g.members).every(m => m.priority === 1)).toBe(true)
    })

    it("nutzt eine Kette über einen freien Platz, auch wenn der erste Umzug allein schlechter wäre", () => {
        // s2 nach group-3 kostet +3, macht aber group-2 für s1 frei (−8): Summe 10 → 5
        const students = [
            studentWith("s1", [["group-2", 1], ["group-1", 3]]),
            studentWith("s2", [["group-2", 1], ["group-3", 2]]),
        ]
        const groups = seat(createGroups(3, 1), {"group-1": [["s1", 3]], "group-2": [["s2", 1]]})
        const r = optimizeAssignment(students, groups, 3)
        expect(r[1].members).toEqual([{studentId: "s1", priority: 1}])
        expect(r[2].members).toEqual([{studentId: "s2", priority: 2}])
        expect(r[0].members).toEqual([])
        expect(r[0].full).toBe(false)
        expect(r[1].full).toBe(true)
    })

    it("gewichtet quadratisch: lieber zweimal Prio 2 als Prio 1 und Prio 3", () => {
        // linear wären beide Zuteilungen gleich gut (1 + 3 = 2 + 2), quadriert 10 gegen 8
        const students = [
            studentWith("s1", [["group-1", 1], ["group-2", 2]]),
            studentWith("s2", [["group-1", 2], ["group-3", 3]]),
        ]
        const groups = seat(createGroups(3, 1), {"group-1": [["s1", 1]], "group-3": [["s2", 3]]})
        expect(placement(optimizeAssignment(students, groups, 3))).toEqual({"group-1": ["s2"], "group-2": ["s1"], "group-3": []})
    })

    it("vergibt keine Priorität schlechter als maxPrio, auch wenn die Summe dadurch sinken würde", () => {
        // Tausch ergäbe 1² + 5² = 26 < 4² + 4² = 32, braucht aber Prio 5
        const students = [
            studentWith("s1", [["group-2", 1], ["group-1", 4]]),
            studentWith("s2", [["group-2", 4], ["group-1", 5]]),
        ]
        const groups = seat(createGroups(2, 1), {"group-1": [["s1", 4]], "group-2": [["s2", 4]]})
        expect(placement(optimizeAssignment(students, groups, 4))).toEqual({"group-1": ["s1"], "group-2": ["s2"]})
        expect(placement(optimizeAssignment(students, groups, 5))).toEqual({"group-1": ["s2"], "group-2": ["s1"]})
    })

    it("verändert die übergebenen Gruppen nicht", () => {
        const students = [studentWith("s1", [["group-1", 2], ["group-2", 1]])]
        const groups = seat(createGroups(2, 1), {"group-1": [["s1", 2]]})
        const before = structuredClone(groups)
        optimizeAssignment(students, groups, 2)
        expect(groups).toEqual(before)
    })

    it("erreicht dasselbe Minimum wie Ausprobieren aller Zuteilungen", () => {
        // kleine Zufallsinstanzen (Seed), Erwartung per Brute Force unabhängig vom Algorithmus berechnet
        for (let seed = 1; seed <= 40; seed++) {
            let state = seed
            const random = () => (state = (state * 1103515245 + 12345) % 2 ** 31) / 2 ** 31
            const groupCount = 3 + Math.floor(random() * 2)
            const capacity = 1 + Math.floor(random() * 2)
            const students = Array.from({length: 5}, (_, i) => {
                const groupIds = seededShuffle(Array.from({length: groupCount}, (_, k) => `group-${k + 1}`), seed * 10 + i)
                return studentWith(`s${i + 1}`, groupIds.map((id, k) => [id, k + 1] as [string, number]))
            })
            const maxPrio = groupCount
            const start = assignWithinR(students, createGroups(groupCount, capacity), maxPrio)

            const r = optimizeAssignment(students, start.groups, maxPrio)

            const assigned = students.filter(st => !start.unassigned.includes(st.studentId))
            const prio = (st: StudentChoices, groupId: string) => st.choices.find(c => c.groupId === groupId)?.priority
            let bruteForceMin = Infinity
            const used = new Array<number>(groupCount).fill(0)
            const search = (index: number, cost: number) => {
                if (index === assigned.length) { bruteForceMin = Math.min(bruteForceMin, cost); return }
                for (let g = 0; g < groupCount; g++) {
                    const p = prio(assigned[index], `group-${g + 1}`)
                    if (p === undefined || p > maxPrio || used[g] >= capacity) continue
                    used[g]++
                    search(index + 1, cost + p * p)
                    used[g]--
                }
            }
            search(0, 0)

            const members = r.flatMap(g => g.members.map(m => ({...m, groupId: g.groupId})))
            expect(members.map(m => m.studentId).sort()).toEqual(assigned.map(st => st.studentId).sort())
            for (const g of r) expect(g.members.length).toBeLessThanOrEqual(capacity)
            for (const m of members) expect(m.priority).toBe(prio(students.find(st => st.studentId === m.studentId)!, m.groupId))
            expect(members.reduce((sum, m) => sum + m.priority ** 2, 0)).toBe(bruteForceMin)
        }
    })
})

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

    afterEach(() => vi.restoreAllMocks())

    it("liefert die optimierte Zuteilung, nicht nur das Ergebnis von Phase 1", () => {
        // Math.random → 0.999 lässt den Shuffle die Reihenfolge s1, s2, s3 behalten.
        // Phase 1 (R = 2) ergibt dann s1→group-3, s2→group-1, s3→group-2: Summe 4 + 4 + 1 = 9.
        // Einziges Optimum mit R = 2: s1→group-2, s2→group-3, s3→group-1: Summe 1 + 1 + 4 = 6.
        vi.spyOn(Math, "random").mockReturnValue(0.999)
        const students = [
            studentWith("s1", [["group-2", 1], ["group-3", 2], ["group-1", 3]]),
            studentWith("s2", [["group-3", 1], ["group-1", 2], ["group-2", 3]]),
            studentWith("s3", [["group-2", 1], ["group-1", 2], ["group-3", 3]]),
        ]
        const r = registrationAlgorithm(students, createGroups(3, 1))
        expect(r.unassigned).toEqual([])
        expect(placement(r.groups)).toEqual({"group-1": ["s3"], "group-2": ["s1"], "group-3": ["s2"]})
        expect(r.groups.every(g => g.full)).toBe(true)
    })

    it("meldet die Schüler, die keinen Platz bekommen", () => {
        // 10 Gruppen à 3 Plätze, aber alle wählen nur group-1..4 (12 Plätze)
        const r = registrationAlgorithm(popularGroupsStudents, createGroups(10, 3))
        expect(r.unassigned).toHaveLength(18)
        expect(r.groups.flatMap(g => g.members)).toHaveLength(12)
    })
});
