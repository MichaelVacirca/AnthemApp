import { NextResponse, type NextRequest } from "next/server";

const ADMIN_COOKIE = "anthem_admin";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 12;

const encoder = new TextEncoder();

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function signPayload(payload: string, secret: string): Promise<string> {
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function isValidCookie(raw: string | undefined, secret: string): Promise<boolean> {
  if (!raw) return false;
  const lastDot = raw.lastIndexOf(".");
  if (lastDot < 0) return false;
  const payload = raw.slice(0, lastDot);
  const sig = raw.slice(lastDot + 1);
  const expected = await signPayload(payload, secret);
  if (!safeEqual(expected, sig)) return false;
  const [issuedAtStr] = payload.split(".");
  const issuedAt = Number(issuedAtStr);
  if (!Number.isFinite(issuedAt)) return false;
  return (Date.now() - issuedAt) / 1000 < COOKIE_MAX_AGE_SECONDS;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/admin")) return NextResponse.next();

  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    return NextResponse.redirect(new URL("/?error=missing_secret", req.url));
  }

  const cookie = req.cookies.get(ADMIN_COOKIE)?.value;
  if (!(await isValidCookie(cookie, secret))) {
    return NextResponse.redirect(new URL("/?error=manager_required", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
