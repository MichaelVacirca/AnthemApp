import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { isValidPin, verifyPin } from "@/lib/pin";
import { startStaffSession } from "@/lib/staff-session";
import { startAdminSession } from "@/lib/session";
import { checkPinRateLimit, getClientIp, recordPinAttempt } from "@/lib/rate-limit";

const Body = z.object({ pin: z.string() });

export async function POST(req: Request) {
  const ip = getClientIp(req);

  const limit = await checkPinRateLimit(ip);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: `Too many attempts. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s).`,
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const body = Body.safeParse(await req.json().catch(() => ({})));
  if (!body.success || !isValidPin(body.data.pin)) {
    return NextResponse.json({ ok: false, error: "Enter a valid 4-6 digit PIN." }, { status: 400 });
  }

  const candidates = await db
    .select()
    .from(schema.staff)
    .where(eq(schema.staff.active, true));

  for (const s of candidates) {
    if (await verifyPin(body.data.pin, s.pinHash)) {
      await recordPinAttempt(ip, true);
      await startStaffSession(s.id);
      if (s.isManager) await startAdminSession();
      return NextResponse.json({ ok: true, isManager: s.isManager });
    }
  }

  await recordPinAttempt(ip, false);
  return NextResponse.json({ ok: false, error: "PIN not recognized." }, { status: 401 });
}
