import { randomBytes } from "crypto";
import { describe, expect, it } from "vitest";
import {
  createStudentCredentials,
  decryptPassword,
  encryptPassword,
  generateStudentPassword,
  loadPasswordKey,
  STUDENT_PASSWORD_ALPHABET,
  STUDENT_PASSWORD_LENGTH,
  verifyStudentPassword,
} from "@/lib/studentPassword";

describe("Schülerpasswort", () => {
  it("erzeugt Passwörter mit richtiger Länge und Zeichen", () => {
    const all = Array.from({ length: 200 }, () => generateStudentPassword());
    for (const p of all) {
      expect(p).toHaveLength(STUDENT_PASSWORD_LENGTH);
      for (const c of p) expect(STUDENT_PASSWORD_ALPHABET).toContain(c);
    }
    expect(new Set(all).size).toBeGreaterThan(1);
  });

  it("ver- und entschlüsselt im Roundtrip", () => {
    const k = randomBytes(32);
    expect(decryptPassword(encryptPassword("abc", k), k)).toBe("abc");
  });

  it("nutzt einen zufälligen IV", () => {
    const k = randomBytes(32);
    expect(encryptPassword("abc", k)).not.toBe(encryptPassword("abc", k));
  });

  it("wirft bei manipuliertem Ciphertext", () => {
    const k = randomBytes(32);
    const [iv, tag, ct] = encryptPassword("abcdef", k).split(":");
    const bytes = Buffer.from(ct, "base64");
    bytes[0] ^= 1;
    expect(() =>
      decryptPassword(`${iv}:${tag}:${bytes.toString("base64")}`, k),
    ).toThrow();
  });

  it("wirft bei verkürztem Auth-Tag", () => {
    const k = randomBytes(32);
    const [iv, tag, ct] = encryptPassword("abcdef", k).split(":");
    const short = Buffer.from(tag, "base64").subarray(0, 8).toString("base64");
    expect(() => decryptPassword(`${iv}:${short}:${ct}`, k)).toThrow();
  });

  it("wirft bei falschem Schlüssel", () => {
    const enc = encryptPassword("abc", randomBytes(32));
    expect(() => decryptPassword(enc, randomBytes(32))).toThrow();
  });

  it("loadPasswordKey wirft bei fehlendem oder falschem Schlüssel", () => {
    expect(() => loadPasswordKey({} as unknown as NodeJS.ProcessEnv)).toThrow(/STUDENT_PASSWORD_KEY/);
    expect(() =>
      loadPasswordKey({
        STUDENT_PASSWORD_KEY: Buffer.alloc(16).toString("base64"),
      } as unknown as NodeJS.ProcessEnv),
    ).toThrow(/32-Byte/);
  });

  it("loadPasswordKey liest gültigen Schlüssel", () => {
    const k = randomBytes(32);
    const loaded = loadPasswordKey({
      STUDENT_PASSWORD_KEY: k.toString("base64"),
    } as unknown as NodeJS.ProcessEnv);
    expect(loaded.equals(k)).toBe(true);
  });

  it("createStudentCredentials liefert Hash und verschlüsseltes Passwort", async () => {
    const k = randomBytes(32);
    const c = await createStudentCredentials(k);
    expect(await verifyStudentPassword(c.password, c.passwordHash)).toBe(true);
    expect(await verifyStudentPassword("falsch", c.passwordHash)).toBe(false);
    expect(decryptPassword(c.passwordEncrypted, k)).toBe(c.password);
  });
});
