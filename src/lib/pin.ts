import bcrypt from "bcryptjs";

export const PIN_REGEX = /^\d{4,6}$/;

export function isValidPin(pin: string): boolean {
  return PIN_REGEX.test(pin);
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}
