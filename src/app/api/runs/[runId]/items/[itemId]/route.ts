import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { readStaffSession } from "@/lib/staff-session";

const Body = z.object({ completed: z.boolean() });

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ runId: string; itemId: string }> },
) {
  const staffId = await readStaffSession();
  if (!staffId) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const { runId, itemId } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const run = await db.query.checklistRun.findFirst({
    where: eq(schema.checklistRun.id, runId),
  });
  if (!run) return NextResponse.json({ ok: false, error: "Run not found." }, { status: 404 });
  if (run.staffId !== staffId) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }
  if (run.completedAt) {
    return NextResponse.json({ ok: false, error: "Shift already signed off." }, { status: 409 });
  }

  await db
    .update(schema.runItem)
    .set({ completedAt: parsed.data.completed ? new Date() : null })
    .where(and(eq(schema.runItem.runId, runId), eq(schema.runItem.itemId, itemId)));

  return NextResponse.json({ ok: true });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ runId: string; itemId: string }> },
) {
  const { runId, itemId } = await params;
  const row = await db.query.runItem.findFirst({
    where: and(eq(schema.runItem.runId, runId), eq(schema.runItem.itemId, itemId)),
  });
  if (!row) return NextResponse.json({ ok: false }, { status: 404 });
  return NextResponse.json({ ok: true, completed: row.completedAt !== null });
}
