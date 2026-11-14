
interface groupPreferences {
    groupId: string;
    preference: number
}

export interface studentPreferenceList {
    studentid: string,
    projectid: string,
    prefList: groupPreferences[]
}



export interface groups {
    groupId : string,
    full : boolean,
    capacity: number,
    students : students[],
}

interface students {
    studentId: string,
    preference: number
}





/**
 * @author Felix Westphal
 * @name registrationAlgorithm
 * @param studentPreferenceLists
 * @param groupList
 * @return boolean
 * @description
 * This Algorithm is seperated in 2 parts.
 * First: Shuffle the students to minimize bias in registration
 * Second:
 */

export function registrationAlgorithm(studentPreferenceLists: studentPreferenceList[] , groupList : groups[]) : boolean {
    //shuffle the students for maximal randomness
    const shuffle = (array:studentPreferenceList[]) => {
        array.sort(() => Math.random() - 0.5);
    }
    shuffle(studentPreferenceLists)

    const {maxPrio} = findMaxPrioR(studentPreferenceLists, groupList)

    console.log(maxPrio)

    return true;
}

export interface AssignmentResult {
    groups: groups[],
    unassigned: string[],
}

interface AssignmentContext {
    studentPreferenceLists: studentPreferenceList[],
    groups: groups[],
    maxPrio: number,
}

/** Prioritäten eines Schülers bis maxPrio, aufsteigend sortiert (Eingabe bleibt unverändert). */
function candidatePreferences(student: studentPreferenceList, maxPrio: number): groupPreferences[] {
    return [...student.prefList]
        .filter(pref => pref.preference <= maxPrio)
        .sort((a, b) => a.preference - b.preference)
}

function placeStudent(group: groups, student: students) {
    group.students.push(student)
    if (group.students.length >= group.capacity) group.full = true
}

/**
 * Versucht in einer vollen Gruppe Platz für newStudent zu schaffen, indem ein Mitglied
 * in eine andere seiner Wunschgruppen (≤ maxPrio) umzieht – notfalls rekursiv über eine Kette.
 * Mitglieder, die nicht in der Schülerliste stehen, werden nie verschoben.
 */
function tryReAssign(group: groups, seen: Set<string>, newStudent: students, ctx: AssignmentContext): boolean {
    seen.add(group.groupId)

    for (let slot = 0; slot < group.students.length; slot++) {
        const member = group.students[slot]
        const stud = ctx.studentPreferenceLists.find(s => s.studentid === member.studentId)
        if (!stud) continue

        for (const pref of candidatePreferences(stud, ctx.maxPrio)) {
            const target = ctx.groups.find(g => g.groupId === pref.groupId)
            if (!target || seen.has(target.groupId)) continue

            const movedMember: students = {studentId: member.studentId, preference: pref.preference}

            if (!target.full) {
                // Platz frei: Mitglied zieht um
                placeStudent(target, movedMember)
                group.students[slot] = newStudent
                return true
            }

            // Ziel voll: rekursiv versuchen, dort jemanden zu verdrängen
            if (tryReAssign(target, seen, movedMember, ctx)) {
                group.students[slot] = newStudent
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
export function assignWithinR(studentPreferenceLists: studentPreferenceList[], groupList: groups[], maxPrio: number): AssignmentResult {
    const ctx: AssignmentContext = {studentPreferenceLists, groups: structuredClone(groupList), maxPrio}
    const unassigned: string[] = []

    students: for (const student of studentPreferenceLists) {
        for (const preference of candidatePreferences(student, maxPrio)) {
            const foundGroup = ctx.groups.find(g => g.groupId === preference.groupId)
            if (!foundGroup) continue

            const newStudent: students = {studentId: student.studentid, preference: preference.preference}
            if (!foundGroup.full) {
                placeStudent(foundGroup, newStudent)
                continue students
            }
            if (tryReAssign(foundGroup, new Set<string>(), newStudent, ctx)) {
                continue students
            }
        }
        unassigned.push(student.studentid)
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
export function findMaxPrioR(studentPreferenceLists: studentPreferenceList[], groupList: groups[]): MaxPrioResult {
    const highestPreference = Math.max(0, ...studentPreferenceLists.flatMap(s => s.prefList.map(p => p.preference)))
    let best: MaxPrioResult = {
        maxPrio: 1,
        unassigned: studentPreferenceLists.filter(s => s.prefList.length === 0).map(s => s.studentid),
    }

    for (let currentMaxPrioR = 1; currentMaxPrioR <= highestPreference; currentMaxPrioR++) {
        const {unassigned} = assignWithinR(studentPreferenceLists, groupList, currentMaxPrioR)
        if (currentMaxPrioR === 1 || unassigned.length < best.unassigned.length) {
            best = {maxPrio: currentMaxPrioR, unassigned}
        }
        if (unassigned.length === 0) break
    }
    return best
}
