import {groupPreferenceList, group} from "@/group-registration/groupRegistration";

export const groupPreferenceListsTestData: groupPreferenceList[] = [
    {
        studentid: "student-01",
        projectid: "project-1",
        preferences: [{groupId: "group-1", preference: 1}, {groupId: "group-2", preference: 4}, {
            groupId: "group-3",
            preference: 2
        }, {groupId: "group-4", preference: 3}]
    },
    {
        studentid: "student-02",
        projectid: "project-1",
        preferences: [{groupId: "group-1", preference: 2}, {groupId: "group-2", preference: 1}, {
            groupId: "group-3",
            preference: 3
        }, {groupId: "group-4", preference: 4}]
    },
    {
        studentid: "student-03",
        projectid: "project-1",
        preferences: [{groupId: "group-1", preference: 4}, {groupId: "group-2", preference: 1}, {
            groupId: "group-3",
            preference: 3
        }, {groupId: "group-4", preference: 2}]
    },
    {
        studentid: "student-04",
        projectid: "project-1",
        preferences: [{groupId: "group-1", preference: 2}, {groupId: "group-2", preference: 1}, {
            groupId: "group-3",
            preference: 3
        }, {groupId: "group-4", preference: 4}]
    },
    {
        studentid: "student-05",
        projectid: "project-1",
        preferences: [{groupId: "group-1", preference: 4}, {groupId: "group-2", preference: 1}, {
            groupId: "group-3",
            preference: 2
        }, {groupId: "group-4", preference: 3}]
    },
    {
        studentid: "student-06",
        projectid: "project-1",
        preferences: [{groupId: "group-1", preference: 1}, {groupId: "group-2", preference: 4}, {
            groupId: "group-3",
            preference: 2
        }, {groupId: "group-4", preference: 3}]
    },
    {
        studentid: "student-07",
        projectid: "project-1",
        preferences: [{groupId: "group-1", preference: 3}, {groupId: "group-2", preference: 1}, {
            groupId: "group-3",
            preference: 4
        }, {groupId: "group-4", preference: 2}]
    },
    {
        studentid: "student-08",
        projectid: "project-1",
        preferences: [{groupId: "group-1", preference: 1}, {groupId: "group-2", preference: 4}, {
            groupId: "group-3",
            preference: 2
        }, {groupId: "group-4", preference: 3}]
    },
    {
        studentid: "student-09",
        projectid: "project-1",
        preferences: [{groupId: "group-1", preference: 3}, {groupId: "group-2", preference: 2}, {
            groupId: "group-3",
            preference: 4
        }, {groupId: "group-4", preference: 1}]
    },
    {
        studentid: "student-10",
        projectid: "project-1",
        preferences: [{groupId: "group-1", preference: 4}, {groupId: "group-2", preference: 3}, {
            groupId: "group-3",
            preference: 1
        }, {groupId: "group-4", preference: 2}]
    },
    {
        studentid: "student-11",
        projectid: "project-1",
        preferences: [{groupId: "group-1", preference: 1}, {groupId: "group-2", preference: 3}, {
            groupId: "group-3",
            preference: 2
        }, {groupId: "group-4", preference: 4}]
    },
    {
        studentid: "student-12",
        projectid: "project-1",
        preferences: [{groupId: "group-1", preference: 2}, {groupId: "group-2", preference: 3}, {
            groupId: "group-3",
            preference: 1
        }, {groupId: "group-4", preference: 4}]
    },
    {
        studentid: "student-13",
        projectid: "project-1",
        preferences: [{groupId: "group-1", preference: 2}, {groupId: "group-2", preference: 4}, {
            groupId: "group-3",
            preference: 1
        }, {groupId: "group-4", preference: 3}]
    },
    {
        studentid: "student-14",
        projectid: "project-1",
        preferences: [{groupId: "group-1", preference: 1}, {groupId: "group-2", preference: 2}, {
            groupId: "group-3",
            preference: 3
        }, {groupId: "group-4", preference: 4}]
    },
    {
        studentid: "student-15",
        projectid: "project-1",
        preferences: [{groupId: "group-1", preference: 3}, {groupId: "group-2", preference: 1}, {
            groupId: "group-3",
            preference: 2
        }, {groupId: "group-4", preference: 4}]
    },
    {
        studentid: "student-16",
        projectid: "project-1",
        preferences: [{groupId: "group-1", preference: 2}, {groupId: "group-2", preference: 3}, {
            groupId: "group-3",
            preference: 4
        }, {groupId: "group-4", preference: 1}]
    },
    {
        studentid: "student-17",
        projectid: "project-1",
        preferences: [{groupId: "group-1", preference: 2}, {groupId: "group-2", preference: 3}, {
            groupId: "group-3",
            preference: 1
        }, {groupId: "group-4", preference: 4}]
    },
    {
        studentid: "student-18",
        projectid: "project-1",
        preferences: [{groupId: "group-1", preference: 4}, {groupId: "group-2", preference: 2}, {
            groupId: "group-3",
            preference: 3
        }, {groupId: "group-4", preference: 1}]
    },
    {
        studentid: "student-19",
        projectid: "project-1",
        preferences: [{groupId: "group-1", preference: 3}, {groupId: "group-2", preference: 1}, {
            groupId: "group-3",
            preference: 4
        }, {groupId: "group-4", preference: 2}]
    },
    {
        studentid: "student-20",
        projectid: "project-1",
        preferences: [{groupId: "group-1", preference: 3}, {groupId: "group-2", preference: 2}, {
            groupId: "group-3",
            preference: 4
        }, {groupId: "group-4", preference: 1}]
    },
];
export default class groupRegistrationTestData {
}

export const groupList: group[] = [
    { projectId: "project-1", groupId: "group-1", capacity: 5, full: false },
    { projectId: "project-1", groupId: "group-2", capacity: 5, full: false },
    { projectId: "project-1", groupId: "group-3", capacity: 5, full: false },
    { projectId: "project-1", groupId: "group-4", capacity: 5, full: false },
];