import groupPreferenceLists from "@/tests/testData/groupRegistrationTestData";
import registrationAlgorithm from "@/group-registration/groupRegistration";


describe("groupRegistration", () => {
    test("", async () => {
        //registrationAlgorithm(groupPreferenceLists)
        expect(registrationAlgorithm(groupPreferenceLists)).toBe(true)
    })
})