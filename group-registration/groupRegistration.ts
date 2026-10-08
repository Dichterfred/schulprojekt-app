import {groupList, groupPreferenceListsTestData} from "@/tests/testData/groupRegistrationTestData";

interface groupPreferences {
    groupId: string;
    preference: number
}

export interface groupPreferenceList {
    studentid: string,
    projectid: string,
    preferences: groupPreferences[]
}

export interface group {
    projectId: string,
    groupId: string,
    capacity: number,
    full: boolean,
}

interface groups {
    groupId : string,
    full : boolean,
    capacity: number,
    students : students[],
}

interface students {
    studentId: string,
    preference: number
}

var groups : groups[] = [
    {
        groupId : "group-1",
        full: false,
        capacity : 5,
        students : []
    },
    {
        groupId : "group-2",
        full: false,
        capacity : 5,
        students : []
    },
    {
        groupId : "group-3",
        full: false,
        capacity : 5,
        students : []
    },
    {
        groupId : "group-4",
        full: false,
        capacity : 5,
        students : []
    },
]

export function registrationAlgorithm(groupPreferenceList: groupPreferenceList[] , groupList : group[] ) : boolean {
    // cycle through all student interfaces provided

    for (let student in groupPreferenceList) {
        //cycle through all prefenences in each studetn cycle
        const maxPrio = groupPreferenceList[student].preferences.find((prefernece) => prefernece.preference === groups.length )
        const maxPrioGroup = groups.find((groups) => groups.groupId === maxPrio?.groupId)

        if ((maxPrioGroup && maxPrio)) {
            //check if group is full, if not assign student to group
            if(maxPrioGroup.capacity > maxPrioGroup.students.length) {
                maxPrioGroup.students.push({studentId : groupPreferenceList[student].studentid, preference : maxPrio?.preference})
            } else {
                maxPrioGroup.full = true

            }

        }

    }
    console.log(groups[0])
    console.log(groups[1])
    console.log(groups[2])
    console.log(groups[3])

    return true;
}

registrationAlgorithm(groupPreferenceListsTestData, groupList)