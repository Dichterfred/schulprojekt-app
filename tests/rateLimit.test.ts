import { describe, expect, it } from "vitest";
import { createRateLimiter } from "@/lib/rateLimit";

describe("createRateLimiter", () => {
  it("sperrt nach der maximalen Anzahl Fehlversuche", () => {
    const limiter = createRateLimiter(3, 1000, () => 0);
    for (let i = 0; i < 3; i++) {
      expect(limiter.isAllowed("a")).toBe(true);
      limiter.fail("a");
    }
    expect(limiter.isAllowed("a")).toBe(false);
    expect(limiter.isAllowed("b")).toBe(true);
  });

  it("gibt nach Ablauf des Zeitfensters wieder frei", () => {
    let now = 0;
    const limiter = createRateLimiter(1, 1000, () => now);
    limiter.fail("a");
    expect(limiter.isAllowed("a")).toBe(false);
    now = 1000;
    expect(limiter.isAllowed("a")).toBe(true);
  });

  it("setzt nach erfolgreichem Login zurück", () => {
    const limiter = createRateLimiter(1, 1000, () => 0);
    limiter.fail("a");
    limiter.reset("a");
    expect(limiter.isAllowed("a")).toBe(true);
  });
});
