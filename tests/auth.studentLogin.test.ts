import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";

const prismaMock = vi.hoisted(() => ({
  projectDay: { findUnique: vi.fn() },
  student: { findUnique: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { authOptions } from "@/lib/auth";

type Authorize = (
  credentials: Record<string, string> | undefined,
  req: { headers?: Record<string, string> },
) => Promise<unknown>;

function studentAuthorize(): Authorize {
  // CredentialsProvider legt die eigenen Optionen (id, authorize) unter `options` ab.
  const providers = authOptions.providers as unknown as { options: { id?: string; authorize: Authorize } }[];
  const provider = providers.find((p) => p.options?.id === "student-login");
  if (!provider) throw new Error("student-login-Provider fehlt");
  return provider.options.authorize;
}

const PASSWORD = "test-passwort";
let passwordHash = "";
let ipCounter = 0;

beforeAll(async () => {
  passwordHash = await bcrypt.hash(PASSWORD, 4);
});

beforeEach(() => {
  prismaMock.projectDay.findUnique.mockReset();
  prismaMock.student.findUnique.mockReset();
  prismaMock.projectDay.findUnique.mockImplementation(async ({ where }: { where: { code: string } }) =>
    where.code === "PROJEKTTAG-2026"
      ? { id: "day1", schoolClasses: [{ id: "class5a" }, { id: "class6b" }] }
      : null,
  );
  prismaMock.student.findUnique.mockImplementation(async ({ where }: { where: { username: string } }) =>
    where.username === "max.mueller"
      ? {
          id: "stud1",
          firstName: "Max",
          lastName: "Müller",
          passwordHash,
          sessionVersion: 3,
          schoolClassId: "class5a",
        }
      : null,
  );
});

// Eigene IP pro Test, damit sich der Rate-Limiter nicht über Tests hinweg auswirkt.
function req() {
  ipCounter++;
  return { headers: { "x-forwarded-for": `10.0.0.${ipCounter}` } };
}

describe("student-login authorize", () => {
  it("liefert bei gültigen Daten (Groß-/Kleinschreibung, Leerzeichen) einen Schüler mit Projekttag", async () => {
    const user = await studentAuthorize()(
      { code: "  projekttag-2026 ", username: "  Max.Mueller ", password: PASSWORD },
      req(),
    );
    expect(user).toMatchObject({ id: "stud1", role: "STUDENT", projectDayId: "day1", sessionVersion: 3 });
    expect(prismaMock.projectDay.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { code: "PROJEKTTAG-2026" } }),
    );
    expect(prismaMock.student.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { username: "max.mueller" } }),
    );
  });

  it("liefert null, wenn die Klasse nicht am Projekttag teilnimmt", async () => {
    prismaMock.projectDay.findUnique.mockResolvedValue({ id: "day1", schoolClasses: [{ id: "class6b" }] });
    const user = await studentAuthorize()(
      { code: "PROJEKTTAG-2026", username: "max.mueller", password: PASSWORD },
      req(),
    );
    expect(user).toBeNull();
  });

  it("liefert null bei falschem Passwort", async () => {
    const user = await studentAuthorize()(
      { code: "PROJEKTTAG-2026", username: "max.mueller", password: "falsch" },
      req(),
    );
    expect(user).toBeNull();
  });

  it("liefert null bei unbekanntem Code", async () => {
    const user = await studentAuthorize()(
      { code: "GIBTS-NICHT", username: "max.mueller", password: PASSWORD },
      req(),
    );
    expect(user).toBeNull();
  });

  it("liefert null bei unbekanntem Anmeldenamen", async () => {
    const user = await studentAuthorize()(
      { code: "PROJEKTTAG-2026", username: "erika.muster", password: PASSWORD },
      req(),
    );
    expect(user).toBeNull();
  });
});
