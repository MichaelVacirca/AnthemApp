import { db, schema } from "@/db";
import { and, eq, gte, sql } from "drizzle-orm";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

export async function checkPinRateLimit(ip: string): Promise<RateLimitResult> {
  const since = new Date(Date.now() - WINDOW_MS);
  const rows = await db
    .select({
      count: sql<number>`count(*)::int`,
      oldest: sql<Date | null>`min(${schema.authAttempt.attemptedAt})`,
    })
    .from(schema.authAttempt)
    .where(
      and(
        eq(schema.authAttempt.ip, ip),
        eq(schema.authAttempt.succeeded, false),
        gte(schema.authAttempt.attemptedAt, since),
      ),
    );

  const { count, oldest } = rows[0] ?? { count: 0, oldest: null };
  if (count < MAX_FAILURES) return { allowed: true };

  const oldestMs = oldest ? new Date(oldest).getTime() : Date.now();
  const retryAfterMs = Math.max(0, oldestMs + WINDOW_MS - Date.now());
  return { allowed: false, retryAfterSeconds: Math.ceil(retryAfterMs / 1000) };
}

export async function recordPinAttempt(ip: string, succeeded: boolean): Promise<void> {
  await db.insert(schema.authAttempt).values({ ip, succeeded });
}
