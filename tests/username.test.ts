import { describe, expect, it } from "vitest";
import { assignUsernames, buildUsernameBase, normalizeLoginName, withNumberSuffix } from "@/lib/username";

describe("buildUsernameBase", () => {
  it("verbindet mehrere Namen mit Bindestrich und trennt Vor- und Nachname mit Punkt", () => {
    expect(buildUsernameBase("Anna Maria", "von Berg")).toBe("anna-maria.von-berg");
  });

  it("ersetzt Umlaute und ß", () => {
    expect(buildUsernameBase("Jürgen", "Weiß")).toBe("juergen.weiss");
  });

  it("entfernt Akzente", () => {
    expect(buildUsernameBase("Zoë", "Ćorić")).toBe("zoe.coric");
  });

  it("trimmt und behält Bindestriche im Namen", () => {
    expect(buildUsernameBase("  Max  ", "Müller-Lüdenscheidt")).toBe("max.mueller-luedenscheidt");
  });

  it("fasst Bindestrich-Folgen zusammen und entfernt Sonderzeichen", () => {
    expect(buildUsernameBase("Ann--Kathrin", "O'Neil")).toBe("ann-kathrin.oneil");
  });

  it("liefert einen leeren Text, wenn ein Teil leer wird", () => {
    expect(buildUsernameBase("???", "Test")).toBe("");
  });
});

describe("withNumberSuffix", () => {
  it("lässt freie Namen unverändert", () => {
    expect(withNumberSuffix("max.mueller", new Set())).toBe("max.mueller");
  });

  it("hängt die nächste freie Nummer an", () => {
    expect(withNumberSuffix("max.mueller", new Set(["max.mueller", "max.mueller2"]))).toBe("max.mueller3");
  });
});

describe("assignUsernames", () => {
  it("löst Kollisionen auch innerhalb eines Batches auf", () => {
    const taken = new Set(["max.mueller"]);
    const result = assignUsernames(
      [
        { firstName: "Max", lastName: "Müller" },
        { firstName: "Max", lastName: "Müller" },
      ],
      taken,
    );
    expect(result.map((p) => p.username)).toEqual(["max.mueller2", "max.mueller3"]);
    expect(taken.has("max.mueller3")).toBe(true);
  });
});

describe("normalizeLoginName", () => {
  it("trimmt und schreibt klein", () => {
    expect(normalizeLoginName("  Max.Mueller ")).toBe("max.mueller");
  });
});
