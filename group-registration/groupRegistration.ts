
interface groupPreferences {
    groupId: string;
    preference: number
}

interface groupPreferenceList {
    studentid: string,
    projectid: string,
    preferences: groupPreferences[]
}

export function registrationAlgorithm(groupPreferenceList: groupPreferenceList ) {

}