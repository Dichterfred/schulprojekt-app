import { describe, expect, it } from "vitest";
import pkg from "../package.json";

describe("npm run build", () => {
  it("führt Migrationen und Seed vor dem Next-Build aus", () => {
    const steps = pkg.scripts.build.split("&&").map((s) => s.trim());
    expect(steps).toEqual(["prisma generate", "prisma migrate deploy", "prisma db seed", "next build"]);
  });
});
