import { describe, expect, it } from "vitest";
import { compactRanks } from "@/lib/ranks";

describe("compactRanks", () => {
  it("verdichtet Ränge und gibt nur Änderungen zurück", () => {
    expect(
      compactRanks([
        { id: "a", rank: 3 },
        { id: "b", rank: 1 },
        { id: "c", rank: 5 },
      ]),
    ).toEqual([
      { id: "a", from: 3, to: 2 },
      { id: "c", from: 5, to: 3 },
    ]);
  });
  it("liefert bei leerer Liste []", () => {
    expect(compactRanks([])).toEqual([]);
  });
});
