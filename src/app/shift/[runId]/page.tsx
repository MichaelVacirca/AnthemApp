import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { eq, asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { formatBusinessDate } from "@/lib/business-date";
import { readStaffSession } from "@/lib/staff-session";
import ChecklistView from "./ChecklistView";

export const dynamic = "force-dynamic";

export default async function ShiftPage({ params }: { params: Promise<{ runId: string }> }) {
  const staffId = await readStaffSession();
  if (!staffId) redirect("/");

  const { runId } = await params;

  const run = await db.query.checklistRun.findFirst({
    where: eq(schema.checklistRun.id, runId),
  });
  if (!run) notFound();
  if (run.staffId !== staffId) redirect("/");

  const [staff, role, list] = await Promise.all([
    db.query.staff.findFirst({ where: eq(schema.staff.id, run.staffId) }),
    db.query.role.findFirst({ where: eq(schema.role.id, run.roleId) }),
    db.query.checklist.findFirst({ where: eq(schema.checklist.id, run.checklistId) }),
  ]);
  if (!staff || !role || !list) notFound();

  const items = await db
    .select({
      id: schema.checklistItem.id,
      label: schema.checklistItem.label,
      position: schema.checklistItem.position,
      required: schema.checklistItem.required,
      runItemId: schema.runItem.id,
      completedAt: schema.runItem.completedAt,
      notes: schema.runItem.notes,
    })
    .from(schema.runItem)
    .innerJoin(schema.checklistItem, eq(schema.runItem.itemId, schema.checklistItem.id))
    .where(eq(schema.runItem.runId, run.id))
    .orderBy(asc(schema.checklistItem.position), asc(schema.checklistItem.label));

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 pb-24">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-accent">
            {run.shiftType === "opening" ? "Opening" : "Closing"} · {role.name}
          </p>
          <h1 className="mt-1 text-2xl font-semibold">{list.name}</h1>
          <p className="mt-1 text-sm text-white/50">
            {staff.name} · {formatBusinessDate(run.businessDate)}
          </p>
        </div>
        <Link href="/" className="text-xs uppercase tracking-widest text-white/40 hover:text-white/70">
          Exit
        </Link>
      </header>

      {run.completedAt ? (
        <div className="card mb-6 border-emerald-400/30 bg-emerald-400/5 text-emerald-200">
          Shift signed off on{" "}
          {new Date(run.completedAt).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
          .
        </div>
      ) : null}

      <ChecklistView
        runId={run.id}
        completed={Boolean(run.completedAt)}
        items={items.map((i) => ({
          id: i.id,
          runItemId: i.runItemId,
          label: i.label,
          required: i.required,
          completedAt: i.completedAt ? i.completedAt.toISOString() : null,
          notes: i.notes,
        }))}
      />
    </main>
  );
}
