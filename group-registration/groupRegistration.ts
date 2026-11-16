/** Eine Wahl eines Schülers: Gruppe und Priorität (1 = beste). */
export interface GroupChoice {
    groupId: string,
    priority: number,
}

/** Ein Schüler mit seinen Wahlen. Nicht gewählte Gruppen sind ausgeschlossen. */
export interface StudentChoices {
    studentId: string,
    projectId: string,
    choices: GroupChoice[],
}

/** Ein in eine Gruppe eingeteilter Schüler und die Priorität, mit der er dort ist. */
export interface GroupMember {
    studentId: string,
    priority: number,
}

export interface RegistrationGroup {
    groupId: string,
    full: boolean,
    capacity: number,
    members: GroupMember[],
}

/**
 * Gibt eine gleichmäßig zufällig gemischte Kopie zurück (Fisher-Yates); die Eingabe bleibt unverändert.
 * Jede Reihenfolge ist gleich wahrscheinlich – anders als bei sort(() => Math.random() - 0.5).
 */
export function shuffle<T>(array: T[]): T[] {
    const result = [...array]
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]]
    }
    return result
}

/**
 * @author Felix Westphal
 * @name registrationAlgorithm
 * @param students
 * @param groups
 * @return befüllte Kopie der Gruppen und die studentIds, die keinen Platz bekommen
 * @description
 * This Algorithm is seperated in 2 parts.
 * First: Shuffle the students to minimize bias in registration, then find the smallest
 * maximum priority R at which as many students as possible get a place.
 * Second: Optimize that assignment so the sum of squared priorities is minimal (nobody worse than R).
 */
export function registrationAlgorithm(students: StudentChoices[], groups: RegistrationGroup[]): AssignmentResult {
    //shuffle the students for maximal randomness (acts as a lottery for who stays unassigned)
    const shuffledStudents = shuffle(students)

    const {maxPrio} = findMaxPrioR(shuffledStudents, groups)
    const {groups: assigned, unassigned} = assignWithinR(shuffledStudents, groups, maxPrio)

    return {groups: optimizeAssignment(shuffledStudents, assigned, maxPrio), unassigned}
}

export interface AssignmentResult {
    groups: RegistrationGroup[],
    unassigned: string[],
}

interface AssignmentContext {
    students: StudentChoices[],
    groups: RegistrationGroup[],
    maxPrio: number,
}

/** Prioritäten eines Schülers bis maxPrio, aufsteigend sortiert (Eingabe bleibt unverändert). */
function allowedChoices(student: StudentChoices, maxPrio: number): GroupChoice[] {
    return [...student.choices]
        .filter(choice => choice.priority <= maxPrio)
        .sort((a, b) => a.priority - b.priority)
}

function addMember(group: RegistrationGroup, member: GroupMember) {
    group.members.push(member)
    if (group.members.length >= group.capacity) group.full = true
}

/**
 * Versucht in einer vollen Gruppe Platz für newMember zu schaffen, indem ein Mitglied
 * in eine andere seiner Wunschgruppen (≤ maxPrio) umzieht – notfalls rekursiv über eine Kette.
 * Mitglieder, die nicht in der Schülerliste stehen, werden nie verschoben.
 */
function tryReAssign(group: RegistrationGroup, seen: Set<string>, newMember: GroupMember, ctx: AssignmentContext): boolean {
    seen.add(group.groupId)

    for (let slot = 0; slot < group.members.length; slot++) {
        const member = group.members[slot]
        const memberChoices = ctx.students.find(s => s.studentId === member.studentId)
        if (!memberChoices) continue

        for (const choice of allowedChoices(memberChoices, ctx.maxPrio)) {
            const target = ctx.groups.find(g => g.groupId === choice.groupId)
            if (!target || seen.has(target.groupId)) continue

            const movedMember: GroupMember = {studentId: member.studentId, priority: choice.priority}

            if (!target.full) {
                // Platz frei: Mitglied zieht um
                addMember(target, movedMember)
                group.members[slot] = newMember
                return true
            }

            // Ziel voll: rekursiv versuchen, dort jemanden zu verdrängen
            if (tryReAssign(target, seen, movedMember, ctx)) {
                group.members[slot] = newMember
                return true
            }
        }
    }
    return false
}

/**
 * Teilt alle Schüler Gruppen zu, wobei niemand eine schlechtere Priorität als maxPrio bekommt.
 * Nicht gewählte Gruppen sind ausgeschlossen. Bringt so viele Schüler unter wie möglich.
 * @return befüllte Kopie der Gruppen und die studentIds, die nicht untergebracht werden konnten
 */
export function assignWithinR(students: StudentChoices[], groups: RegistrationGroup[], maxPrio: number): AssignmentResult {
    const groupsClone = structuredClone(groups)
    // full aus den Daten ableiten, nicht dem übergebenen Flag vertrauen (z. B. vorbelegte Gruppen der Nachwahl)
    for (const group of groupsClone) group.full = group.members.length >= group.capacity
    const ctx: AssignmentContext = {students, groups: groupsClone, maxPrio}
    const unassigned: string[] = []

    nextStudent: for (const student of students) {
        for (const choice of allowedChoices(student, maxPrio)) {
            const group = ctx.groups.find(g => g.groupId === choice.groupId)
            if (!group) continue

            const newMember: GroupMember = {studentId: student.studentId, priority: choice.priority}
            if (!group.full) {
                addMember(group, newMember)
                continue nextStudent
            }
            if (tryReAssign(group, new Set<string>(), newMember, ctx)) {
                continue nextStudent
            }
        }
        unassigned.push(student.studentId)
    }

    return {groups: ctx.groups, unassigned}
}

export interface MaxPrioResult {
    maxPrio: number,
    unassigned: string[],
}

/**
 * Sucht das kleinste R (schlechteste zugeteilte Priorität), bei dem bereits so viele Schüler
 * unterkommen wie überhaupt möglich – im Normalfall alle.
 * @return maxPrio und die studentIds, die selbst dann nicht untergebracht werden können
 */
export function findMaxPrioR(students: StudentChoices[], groups: RegistrationGroup[]): MaxPrioResult {
    const highestPriority = Math.max(0, ...students.flatMap(s => s.choices.map(c => c.priority)))
    let best: MaxPrioResult = {
        maxPrio: 1,
        unassigned: students.filter(s => s.choices.length === 0).map(s => s.studentId),
    }

    for (let currentMaxPrioR = 1; currentMaxPrioR <= highestPriority; currentMaxPrioR++) {
        const {unassigned} = assignWithinR(students, groups, currentMaxPrioR)
        if (currentMaxPrioR === 1 || unassigned.length < best.unassigned.length) {
            best = {maxPrio: currentMaxPrioR, unassigned}
        }
        if (unassigned.length === 0) break
    }
    return best
}

/** Umzug eines Schülers von Gruppe from nach Gruppe to (Indizes; FREI = groups.length). */
interface MoveEdge {
    from: number,
    to: number,
    weight: number,
    studentId?: string,
    priority?: number,
}

/**
 * Baut den Umzugsgraphen: Knoten sind die Gruppen plus FREI.
 * X → Y: ein Schüler aus X könnte nach Y (Gewicht = Änderung der Quadratsumme, der günstigste je Paar).
 * Y → FREI: Y hat einen freien Platz. FREI → X: X darf einen Schüler abgeben.
 */
function buildMoveGraph(students: StudentChoices[], groups: RegistrationGroup[], maxPrio: number): MoveEdge[] {
    const free = groups.length
    const best = new Map<string, MoveEdge>()

    groups.forEach((group, from) => {
        for (const member of group.members) {
            const student = students.find(s => s.studentId === member.studentId)
            if (!student) continue // vorab eingetragene Schüler bleiben, wo sie sind
            for (const choice of allowedChoices(student, maxPrio)) {
                const to = groups.findIndex(g => g.groupId === choice.groupId)
                if (to === -1 || to === from) continue
                const weight = choice.priority ** 2 - member.priority ** 2
                const key = `${from}-${to}`
                if (!best.has(key) || weight < best.get(key)!.weight) {
                    best.set(key, {from, to, weight, studentId: member.studentId, priority: choice.priority})
                }
            }
        }
    })

    const edges = [...best.values()]
    groups.forEach((group, index) => {
        if (group.members.length < group.capacity) edges.push({from: index, to: free, weight: 0})
        edges.push({from: free, to: index, weight: 0})
    })
    return edges
}

/** Bellman-Ford: liefert die Kanten eines Kreises mit negativer Summe oder null. */
function findNegativeCycle(edges: MoveEdge[], nodeCount: number): MoveEdge[] | null {
    const dist = new Array<number>(nodeCount).fill(0) // wie eine unsichtbare Quelle zu allen Knoten
    const pred = new Array<MoveEdge | null>(nodeCount).fill(null)
    let relaxed = -1

    for (let round = 0; round < nodeCount; round++) {
        relaxed = -1
        for (const edge of edges) {
            if (dist[edge.from] + edge.weight < dist[edge.to]) {
                dist[edge.to] = dist[edge.from] + edge.weight
                pred[edge.to] = edge
                relaxed = edge.to
            }
        }
        if (relaxed === -1) return null // nichts mehr verbessert → kein negativer Kreis
    }

    // in der letzten Runde noch verbessert → negativer Kreis; nodeCount Schritte zurück landen sicher darin
    let node = relaxed
    for (let i = 0; i < nodeCount; i++) node = pred[node]!.from

    const cycle: MoveEdge[] = []
    let current = node
    do {
        const edge = pred[current]!
        cycle.push(edge)
        current = edge.from
    } while (current !== node)
    return cycle
}

/** Führt alle Umzüge eines Kreises aus; Kanten über FREI bewegen niemanden. */
function applyCycle(groups: RegistrationGroup[], cycle: MoveEdge[]) {
    const moves = cycle.filter(edge => edge.studentId !== undefined)
    for (const move of moves) {
        const source = groups[move.from]
        source.members.splice(source.members.findIndex(m => m.studentId === move.studentId), 1)
    }
    for (const move of moves) {
        groups[move.to].members.push({studentId: move.studentId!, priority: move.priority!})
    }
}

/**
 * Verbessert eine fertige Zuteilung: minimiert die Summe der quadrierten Prioritäten,
 * ohne dass jemand eine schlechtere Priorität als maxPrio bekommt. Wer zugeteilt ist, bleibt zugeteilt.
 * Solange der Umzugsgraph einen Kreis mit negativer Summe hat, wird dieser ausgeführt –
 * gibt es keinen mehr, ist die Zuteilung optimal.
 * @return verbesserte Kopie der Gruppen
 */
export function optimizeAssignment(students: StudentChoices[], groups: RegistrationGroup[], maxPrio: number): RegistrationGroup[] {
    const groupsClone = structuredClone(groups)
    for (;;) {
        const cycle = findNegativeCycle(buildMoveGraph(students, groupsClone, maxPrio), groupsClone.length + 1)
        if (!cycle) break
        applyCycle(groupsClone, cycle)
    }
    for (const group of groupsClone) group.full = group.members.length >= group.capacity
    return groupsClone
}
