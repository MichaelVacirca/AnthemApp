import { cookies } from "next/headers";
import { createHmac, timingSafeEqual, randomBytes } from "crypto";

const ADMIN_COOKIE = "anthem_admin";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 12;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET must be set to a value of at least 16 characters.");
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function startAdminSession(): Promise<void> {
  const issuedAt = Date.now().toString();
  const nonce = randomBytes(8).toString("hex");
  const payload = `${issuedAt}.${nonce}`;
  const value = `${payload}.${sign(payload)}`;
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

export async function endAdminSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const jar = await cookies();
  const raw = jar.get(ADMIN_COOKIE)?.value;
  if (!raw) return false;
  const lastDot = raw.lastIndexOf(".");
  if (lastDot < 0) return false;
  const payload = raw.slice(0, lastDot);
  const sig = raw.slice(lastDot + 1);
  if (!safeEqual(sign(payload), sig)) return false;
  const [issuedAtStr] = payload.split(".");
  const issuedAt = Number(issuedAtStr);
  if (!Number.isFinite(issuedAt)) return false;
  const ageSeconds = (Date.now() - issuedAt) / 1000;
  return ageSeconds < COOKIE_MAX_AGE_SECONDS;
}

export function checkAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || expected.length === 0) return false;
  return safeEqual(password, expected);
}
