import { createCipheriv, createDecipheriv, randomBytes, randomInt } from "crypto";
import bcrypt from "bcryptjs";

export const STUDENT_PASSWORD_LENGTH = 10;
// Ohne leicht verwechselbare Zeichen (i, l, o, 0, 1)
export const STUDENT_PASSWORD_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** Zufälliges, kryptographisch sicheres Schülerpasswort. */
export function generateStudentPassword(): string {
  let result = "";
  for (let i = 0; i < STUDENT_PASSWORD_LENGTH; i++) {
    result += STUDENT_PASSWORD_ALPHABET[randomInt(STUDENT_PASSWORD_ALPHABET.length)];
  }
  return result;
}

/** Liest den 32-Byte-Schlüssel (base64) aus STUDENT_PASSWORD_KEY. */
export function loadPasswordKey(env: NodeJS.ProcessEnv = process.env): Buffer {
  const raw = env.STUDENT_PASSWORD_KEY;
  const key = raw ? Buffer.from(raw, "base64") : null;
  if (!key || key.length !== 32) {
    throw new Error("STUDENT_PASSWORD_KEY fehlt oder ist kein 32-Byte-Schlüssel (base64).");
  }
  return key;
}

/** AES-256-GCM; Format "iv:authTag:ciphertext" (jeweils base64). */
export function encryptPassword(plain: string, key: Buffer = loadPasswordKey()): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((b) => b.toString("base64")).join(":");
}

export function decryptPassword(encrypted: string, key: Buffer = loadPasswordKey()): string {
  const parts = encrypted.split(":");
  if (parts.length !== 3) throw new Error("Ungültiges Format des verschlüsselten Passworts.");
  const [iv, tag, ciphertext] = parts.map((p) => Buffer.from(p, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export async function createStudentCredentials(
  key?: Buffer,
): Promise<{ password: string; passwordHash: string; passwordEncrypted: string }> {
  const password = generateStudentPassword();
  const passwordHash = await bcrypt.hash(password, 10);
  const passwordEncrypted = encryptPassword(password, key);
  return { password, passwordHash, passwordEncrypted };
}

export function verifyStudentPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
