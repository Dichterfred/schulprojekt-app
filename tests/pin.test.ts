import { describe, expect, it } from "vitest";
import { generatePin, hashPin, PIN_LENGTH, verifyPin } from "@/lib/pin";

describe("PIN", () => {
  it("erzeugt immer genau 6 Ziffern", () => {
    for (let i = 0; i < 200; i++) expect(generatePin()).toMatch(new RegExp(`^[0-9]{${PIN_LENGTH}}$`));
  });

  it("prüft die richtige PIN gegen den Hash und lehnt falsche ab", async () => {
    const hash = await hashPin("012345");
    expect(hash).not.toContain("012345");
    expect(await verifyPin("012345", hash)).toBe(true);
    expect(await verifyPin("012346", hash)).toBe(false);
  });
});
