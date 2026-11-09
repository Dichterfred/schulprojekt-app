import { randomInt } from "crypto";
import bcrypt from "bcryptjs";

export const PIN_LENGTH = 6;

/** Zufällige, kryptographisch sichere PIN aus Ziffern (führende Nullen erlaubt). */
export function generatePin(): string {
  return randomInt(0, 10 ** PIN_LENGTH).toString().padStart(PIN_LENGTH, "0");
}

export function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

export function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}
