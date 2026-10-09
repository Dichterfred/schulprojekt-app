import * as string_decoder from "node:string_decoder";

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

    let maxPrio = findMaxPrioR(studentPreferenceLists, groupList)

    console.log(maxPrio)

    return true;
}

function findMaxPrioR(studentPreferenceLists: studentPreferenceList[] , groupList : groups[]) : number {
    let maxPrio = 1
    //search for maximal prefernece where all students get a place
    let currentMaxPrioR = 1
    while (currentMaxPrioR <= groupList.length) {
        let groupsClone = structuredClone(groupList)

        let studentsregistered = 0
        students : for (let student = 0; student < studentPreferenceLists.length; student++) {
            loopPrefernece : for (let loopPreference = 0; loopPreference < groupsClone.length; loopPreference++) {

                let preference = studentPreferenceLists[student].prefList.find(pref => pref.preference === loopPreference + 1)
                if (preference === undefined) continue
                if (preference?.preference <= currentMaxPrioR) {

                    let foundGroup = groupsClone.find(groupsClone => groupsClone.groupId === preference?.groupId)
                    if (foundGroup) {
                        if (!foundGroup.full) {
                            foundGroup.students.push({studentId : studentPreferenceLists[student].studentid, preference : preference.preference})
                            if (foundGroup.students.length === foundGroup.capacity) {
                                foundGroup.full = true
                            }
                            studentsregistered++
                            continue students
                        } else {
                            const tryReAssign = (
                                group: groups,
                                seen: Set<string>,
                                newStudent: students
                            ): boolean => {
                                seen.add(group.groupId)

                                for (let slot = 0; slot < group.students.length; slot++) {
                                    const member = group.students[slot]
                                    const stud = studentPreferenceLists.find(s => s.studentid === member.studentId)
                                    if (!stud) continue

                                    const options = [...stud.prefList]
                                        .filter(p => p.preference <= currentMaxPrioR)
                                        .sort((a, b) => a.preference - b.preference)

                                    for (const pref of options) {
                                        const target = groupsClone.find(g => g.groupId === pref.groupId)
                                        if (!target || seen.has(target.groupId)) continue

                                        const movedMember: students = { studentId: member.studentId, preference: pref.preference }

                                        if (!target.full) {
                                            // Platz frei: Besitzer zieht um
                                            target.students.push(movedMember)
                                            if (target.students.length === target.capacity) target.full = true
                                            group.students[slot] = newStudent
                                            return true
                                        }

                                        // Ziel voll: rekursiv versuchen, dort jemanden zu verdrängen
                                        if (tryReAssign(target, seen, movedMember)) {
                                            group.students[slot] = newStudent
                                            return true
                                        }
                                    }
                                }
                                return false
                            }

                            if (tryReAssign(
                                foundGroup,
                                new Set<string>(),
                                { studentId: studentPreferenceLists[student].studentid, preference: preference.preference }
                            )) {
                                studentsregistered++
                                continue students
                            }
                        }
                    }

                }
            }
        }
        if (studentsregistered === studentPreferenceLists.length) {
            maxPrio = currentMaxPrioR
            break
        }

        currentMaxPrioR++
    }
    return maxPrio;
}