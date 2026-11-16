import {AssignmentResult, registrationAlgorithm, RegistrationGroup, StudentChoices} from "./groupRegistration";

/** Zufallsquelle im Bereich [0, 1). */
export type Random = () => number

/** Eine Testgruppe für die Simulation. Beliebtheit 1 … 10 wirkt als Gewicht beim Wählen. */
export interface SimGroup {
    groupId: string,
    name: string,
    capacity: number,
    popularity: number,
}

/** Vollständige Rangliste eines Test-Schülers über alle Gruppen (beste zuerst). */
export interface StudentRanking {
    studentId: string,
    ranking: string[],
    /** Anteil (0, 1] der erlaubten Prioritäten, die der Schüler bei „zufällig 1 … k“ abgibt. */
    countFraction: number,
}

const ADJECTIVES = ["Rote", "Blaue", "Grüne", "Schnelle", "Kluge", "Wilde", "Stille", "Mutige", "Bunte", "Flinke"]
const NOUNS = ["Füchse", "Eulen", "Raketen", "Kometen", "Bären", "Forscher", "Wellen", "Drachen", "Falken", "Pinguine"]

function pick<T>(list: T[], random: Random): T {
    return list[Math.floor(random() * list.length)]
}

/** Begrenzt eine Beliebtheit auf eine ganze Zahl 1 … 10; ungültige Werte werden 1. */
export function clampPopularity(value: number): number {
    if (Number.isNaN(value)) return 1
    return Math.min(10, Math.max(1, Math.round(value)))
}

/** Erzeugt count Gruppen mit Zufallsnamen; Kapazität ceil(Schüler / Gruppen), Beliebtheit 5. */
export function generateGroups(count: number, studentCount: number, random: Random = Math.random): SimGroup[] {
    const capacity = Math.max(1, Math.ceil(studentCount / count))
    return Array.from({length: count}, (_, i) => ({
        groupId: `g${i + 1}`,
        name: `${pick(ADJECTIVES, random)} ${pick(NOUNS, random)}`,
        capacity,
        popularity: 5,
    }))
}

/**
 * Erzeugt für jeden Schüler eine vollständige Rangliste aller Gruppen.
 * Gewichtetes Ziehen ohne Zurücklegen (Efraimidis–Spirakis): key = u^(1/Gewicht), absteigend sortiert.
 */
export function generateRankings(studentCount: number, groups: SimGroup[], random: Random = Math.random): StudentRanking[] {
    return Array.from({length: studentCount}, (_, i) => {
        const ranking = groups
            .map(group => ({groupId: group.groupId, key: random() ** (1 / clampPopularity(group.popularity))}))
            .sort((a, b) => b.key - a.key)
            .map(entry => entry.groupId)
        return {studentId: `Schüler ${i + 1}`, ranking, countFraction: 1 - random()}
    })
}

/** Nimmt die ersten k (bzw. zufällig 1 … k) Plätze jeder Rangliste als Prioritäten 1, 2, … */
export function toStudentChoices(rankings: StudentRanking[], k: number, randomCount: boolean): StudentChoices[] {
    return rankings.map(({studentId, ranking, countFraction}) => {
        const wanted = randomCount ? Math.max(1, Math.ceil(countFraction * k)) : k
        const choices = ranking
            .slice(0, Math.min(wanted, ranking.length))
            .map((groupId, index) => ({groupId, priority: index + 1}))
        return {studentId, projectId: "test", choices}
    })
}

/** Wandelt Testgruppen in leere Gruppen für den Algorithmus um. */
export function toRegistrationGroups(groups: SimGroup[]): RegistrationGroup[] {
    return groups.map(({groupId, capacity}) => ({groupId, capacity, members: [], full: false}))
}

/** Ergebnis eines Simulationslaufs mit Auswertung. */
export interface SimulationResult {
    assignment: AssignmentResult,
    /** Laufzeit nur von registrationAlgorithm. */
    durationMs: number,
    /** Index i = Anzahl Schüler mit Priorität i + 1; Länge = k. */
    priorityCounts: number[],
    assignedCount: number,
    unassignedCount: number,
    /** Höchste vergebene Priorität, null wenn niemand zugeteilt wurde. */
    worstPriority: number | null,
}

/** Eine Zeile des Vergleichs über verschiedene erlaubte Prioritäten k. */
export interface KComparisonRow {
    k: number,
    unassignedCount: number,
    worstPriority: number | null,
    durationMs: number,
}

/** Lässt den Algorithmus mit den ersten k Plätzen der Ranglisten laufen und wertet das Ergebnis aus. */
export function runSimulation(rankings: StudentRanking[], groups: SimGroup[], k: number, randomCount: boolean): SimulationResult {
    const students = toStudentChoices(rankings, k, randomCount)
    const registrationGroups = toRegistrationGroups(groups)

    const start = performance.now()
    const assignment = registrationAlgorithm(students, registrationGroups)
    const durationMs = performance.now() - start

    const priorityCounts = new Array<number>(Math.max(k, 0)).fill(0)
    let assignedCount = 0
    let worstPriority: number | null = null
    for (const group of assignment.groups) {
        for (const member of group.members) {
            priorityCounts[member.priority - 1]++
            assignedCount++
            worstPriority = Math.max(worstPriority ?? 0, member.priority)
        }
    }
    return {assignment, durationMs, priorityCounts, assignedCount, unassignedCount: assignment.unassigned.length, worstPriority}
}

/** Führt die Simulation mit denselben Ranglisten für k = 1 … Gruppenanzahl aus. */
export function compareK(rankings: StudentRanking[], groups: SimGroup[], randomCount: boolean): KComparisonRow[] {
    return groups.map((_, index) => {
        const {unassignedCount, worstPriority, durationMs} = runSimulation(rankings, groups, index + 1, randomCount)
        return {k: index + 1, unassignedCount, worstPriority, durationMs}
    })
}
