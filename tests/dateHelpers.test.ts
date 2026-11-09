import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { endOfDayUTC, formatDateOnly, startOfDayUTC, toDateOnly } from "@/lib/dateHelpers";

describe("formatDateOnly", () => {
  const originalTz = process.env.TZ;
  beforeAll(() => { process.env.TZ = "Europe/Berlin"; });
  afterAll(() => { process.env.TZ = originalTz; });

  it("zeigt den eingegebenen Tag auch für das Tagesende (23:59:59.999Z) in lokaler Zeitzone", () => {
    expect(formatDateOnly(endOfDayUTC("2026-12-16"))).toBe("16.12.2026");
    expect(formatDateOnly(startOfDayUTC("2026-12-14"))).toBe("14.12.2026");
  });

  it("stimmt mit toDateOnly überein", () => {
    expect(toDateOnly(endOfDayUTC("2026-12-16"))).toBe("2026-12-16");
  });
});
