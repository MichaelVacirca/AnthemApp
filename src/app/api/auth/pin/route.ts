import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { isValidPin, verifyPin } from "@/lib/pin";
import { startStaffSession } from "@/lib/staff-session";

const Body = z.object({ pin: z.string() });

export async function POST(req: Request) {
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
      await startStaffSession(s.id);
      return NextResponse.json({ ok: true });
    }
  }

  return NextResponse.json({ ok: false, error: "PIN not recognized." }, { status: 401 });
}
