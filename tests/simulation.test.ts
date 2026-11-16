import {describe, expect, it} from "vitest";
import {
    clampPopularity,
    compareK,
    generateGroups,
    generateRankings,
    runSimulation,
    SimGroup,
    StudentRanking,
    toRegistrationGroups,
    toStudentChoices,
} from "../group-registration/simulation";

describe("generateGroups", () => {
    it("erzeugt count Gruppen mit eindeutigen IDs, Kapazität ceil(Schüler/Gruppen), Beliebtheit 5", () => {
        const groups = generateGroups(3, 10)
        expect(groups).toHaveLength(3)
        expect(new Set(groups.map(g => g.groupId)).size).toBe(3)
        expect(groups.every(g => g.capacity === 4 && g.popularity === 5)).toBe(true)
        expect(groups.every(g => g.name.length > 0)).toBe(true)
    })
    it("liefert bei 0 Gruppen ein leeres Array", () => {
        expect(generateGroups(0, 10)).toEqual([])
    })
})

describe("clampPopularity", () => {
    it("begrenzt auf 1 … 10", () => {
        expect([0, -3, 11, NaN, 4.6].map(clampPopularity)).toEqual([1, 1, 10, 1, 5])
    })
})

describe("generateRankings", () => {
    it("jeder Schüler rankt jede Gruppe genau einmal, IDs 'Schüler 1' …", () => {
        const groups = generateGroups(4, 6)
        const rankings = generateRankings(6, groups)
        expect(rankings.map(r => r.studentId)).toEqual(["Schüler 1", "Schüler 2", "Schüler 3", "Schüler 4", "Schüler 5", "Schüler 6"])
        for (const r of rankings) {
            expect([...r.ranking].sort()).toEqual(groups.map(g => g.groupId).sort())
            expect(r.countFraction).toBeGreaterThan(0)
            expect(r.countFraction).toBeLessThanOrEqual(1)
        }
    })
    it("beliebtere Gruppe landet deutlich öfter auf Platz 1", () => {
        const groups = generateGroups(2, 2000)
        groups[0].popularity = 10
        groups[1].popularity = 1
        const firsts = generateRankings(2000, groups).filter(r => r.ranking[0] === groups[0].groupId).length
        expect(firsts).toBeGreaterThan(1600) // erwartet ≈ 10/11 ≈ 1818
    })
    it("Beliebtheit 0 erzeugt keine kaputte Rangliste", () => {
        const groups = generateGroups(3, 5)
        groups[1].popularity = 0
        for (const r of generateRankings(5, groups)) expect(r.ranking).toHaveLength(3)
    })
})

describe("toStudentChoices", () => {
    const rankings: StudentRanking[] = [
        {studentId: "Schüler 1", ranking: ["a", "b", "c"], countFraction: 0.4},
    ]
    it("genau k: erste k Plätze als Priorität 1, 2, …", () => {
        expect(toStudentChoices(rankings, 2, false)[0].choices)
            .toEqual([{groupId: "a", priority: 1}, {groupId: "b", priority: 2}])
    })
    it("k größer als Gruppenanzahl wird auf die Ranglistenlänge begrenzt", () => {
        expect(toStudentChoices(rankings, 5, false)[0].choices).toHaveLength(3)
    })
    it("zufällig: Anzahl = max(1, ceil(countFraction * k)) und wächst monoton mit k", () => {
        const counts = [1, 2, 3].map(k => toStudentChoices(rankings, k, true)[0].choices.length)
        expect(counts).toEqual([1, 1, 2])
    })
})

describe("toRegistrationGroups", () => {
    it("übernimmt ID und Kapazität, leere Mitglieder, full=false", () => {
        expect(toRegistrationGroups([{groupId: "a", name: "X", capacity: 2, popularity: 5}]))
            .toEqual([{groupId: "a", capacity: 2, members: [], full: false}])
    })
})

describe("runSimulation", () => {
    const groups: SimGroup[] = [
        {groupId: "a", name: "A", capacity: 1, popularity: 5},
        {groupId: "b", name: "B", capacity: 1, popularity: 5},
    ]
    const rankings: StudentRanking[] = [
        {studentId: "Schüler 1", ranking: ["a", "b"], countFraction: 1},
        {studentId: "Schüler 2", ranking: ["a", "b"], countFraction: 1},
        {studentId: "Schüler 3", ranking: ["a", "b"], countFraction: 1},
    ]
    it("zählt Prioritäten, Übriggebliebene und misst die Zeit", () => {
        const r = runSimulation(rankings, groups, 2, false)
        expect(r.priorityCounts).toEqual([1, 1])
        expect(r.assignedCount).toBe(2)
        expect(r.unassignedCount).toBe(1)
        expect(r.assignment.unassigned).toHaveLength(1)
        expect(r.worstPriority).toBe(2)
        expect(r.durationMs).toBeGreaterThanOrEqual(0)
    })
    it("merkt sich die simulierte Schülerzahl für die Prozentangaben", () => {
        expect(runSimulation(rankings, groups, 2, false).studentCount).toBe(3)
    })
    it("läuft mit 0 Schülern und mit 0 Gruppen ohne Fehler", () => {
        expect(runSimulation([], groups, 1, false).assignedCount).toBe(0)
        const noGroups = runSimulation(rankings.map(r => ({...r, ranking: []})), [], 1, false)
        expect(noGroups.unassignedCount).toBe(3)
        expect(noGroups.worstPriority).toBeNull()
    })
})

describe("compareK", () => {
    it("eine Zeile pro k = 1 … Gruppenanzahl, mehr Prioritäten → nicht mehr Übriggebliebene", () => {
        const groups: SimGroup[] = [
            {groupId: "a", name: "A", capacity: 1, popularity: 5},
            {groupId: "b", name: "B", capacity: 1, popularity: 5},
        ]
        const rankings: StudentRanking[] = [
            {studentId: "Schüler 1", ranking: ["a", "b"], countFraction: 1},
            {studentId: "Schüler 2", ranking: ["a", "b"], countFraction: 1},
        ]
        const rows = compareK(rankings, groups, false)
        expect(rows.map(r => r.k)).toEqual([1, 2])
        expect(rows.map(r => r.unassignedCount)).toEqual([1, 0])
        expect(rows.map(r => r.worstPriority)).toEqual([1, 2])
    })
})
