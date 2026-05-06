import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { businessDateFor } from "@/lib/business-date";
import { readStaffSession } from "@/lib/staff-session";

const Body = z.object({
  roleId: z.string().uuid(),
  shiftType: z.enum(["opening", "closing"]),
});

export async function POST(req: Request) {
  const staffId = await readStaffSession();
  if (!staffId) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const { roleId, shiftType } = parsed.data;

  const link = await db.query.staffRole.findFirst({
    where: and(eq(schema.staffRole.staffId, staffId), eq(schema.staffRole.roleId, roleId)),
  });
  if (!link) {
    return NextResponse.json({ ok: false, error: "Not assigned to this role." }, { status: 403 });
  }

  const list = await db.query.checklist.findFirst({
    where: and(
      eq(schema.checklist.roleId, roleId),
      eq(schema.checklist.shiftType, shiftType),
      eq(schema.checklist.active, true),
    ),
  });
  if (!list) {
    return NextResponse.json(
      { ok: false, error: "No active checklist for that role and shift." },
      { status: 404 },
    );
  }

  const businessDate = businessDateFor();

  const existing = await db.query.checklistRun.findFirst({
    where: and(
      eq(schema.checklistRun.staffId, staffId),
      eq(schema.checklistRun.checklistId, list.id),
      eq(schema.checklistRun.businessDate, businessDate),
      isNull(schema.checklistRun.completedAt),
    ),
  });
  if (existing) {
    return NextResponse.json({ ok: true, runId: existing.id, resumed: true });
  }

  const items = await db
    .select()
    .from(schema.checklistItem)
    .where(eq(schema.checklistItem.checklistId, list.id));

  const runId = await db.transaction(async (tx) => {
    const [run] = await tx
      .insert(schema.checklistRun)
      .values({
        staffId,
        roleId,
        checklistId: list.id,
        shiftType,
        businessDate,
      })
      .returning({ id: schema.checklistRun.id });

    if (items.length) {
      await tx.insert(schema.runItem).values(
        items.map((it) => ({
          runId: run.id,
          itemId: it.id,
        })),
      );
    }
    return run.id;
  });

  return NextResponse.json({ ok: true, runId });
}
