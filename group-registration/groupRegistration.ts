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
 * @return boolean
 * @description
 * This Algorithm is seperated in 2 parts.
 * First: Shuffle the students to minimize bias in registration
 * Second:
 */

export function registrationAlgorithm(students: StudentChoices[], groups: RegistrationGroup[]) : boolean {
    //shuffle the students for maximal randomness (acts as a lottery for who stays unassigned)
    const shuffledStudents = shuffle(students)

    const {maxPrio} = findMaxPrioR(shuffledStudents, groups)

    console.log(maxPrio)

    return true;
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
