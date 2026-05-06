import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { readStaffSession } from "@/lib/staff-session";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const staffId = await readStaffSession();
  if (!staffId) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const { runId } = await params;

  const run = await db.query.checklistRun.findFirst({
    where: eq(schema.checklistRun.id, runId),
  });
  if (!run) return NextResponse.json({ ok: false, error: "Run not found." }, { status: 404 });
  if (run.staffId !== staffId) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }
  if (run.completedAt) return NextResponse.json({ ok: true, alreadyCompleted: true });

  const incomplete = await db
    .select({ id: schema.runItem.id })
    .from(schema.runItem)
    .innerJoin(schema.checklistItem, eq(schema.runItem.itemId, schema.checklistItem.id))
    .where(
      and(
        eq(schema.runItem.runId, runId),
        eq(schema.checklistItem.required, true),
        isNull(schema.runItem.completedAt),
      ),
    );

  if (incomplete.length > 0) {
    return NextResponse.json(
      { ok: false, error: `${incomplete.length} required item(s) still incomplete.` },
      { status: 409 },
    );
  }

  await db
    .update(schema.checklistRun)
    .set({ completedAt: new Date() })
    .where(eq(schema.checklistRun.id, runId));

  return NextResponse.json({ ok: true });
}
