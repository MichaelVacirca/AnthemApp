import Link from "next/link";
import { eq, and, desc, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { businessDateFor, formatBusinessDate } from "@/lib/business-date";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const today = businessDateFor();

  const runs = await db
    .select({
      id: schema.checklistRun.id,
      shiftType: schema.checklistRun.shiftType,
      startedAt: schema.checklistRun.startedAt,
      completedAt: schema.checklistRun.completedAt,
      staffName: schema.staff.name,
      roleName: schema.role.name,
    })
    .from(schema.checklistRun)
    .innerJoin(schema.staff, eq(schema.checklistRun.staffId, schema.staff.id))
    .innerJoin(schema.role, eq(schema.checklistRun.roleId, schema.role.id))
    .where(eq(schema.checklistRun.businessDate, today))
    .orderBy(desc(schema.checklistRun.startedAt));

  const inProgress = runs.filter((r) => !r.completedAt).length;
  const done = runs.filter((r) => r.completedAt).length;

  const expectedToday = await db
    .select({ id: schema.checklist.id })
    .from(schema.checklist)
    .where(eq(schema.checklist.active, true));

  const missingToday = await db
    .select({
      runId: schema.checklistRun.id,
      label: schema.checklistItem.label,
    })
    .from(schema.runItem)
    .innerJoin(schema.checklistItem, eq(schema.runItem.itemId, schema.checklistItem.id))
    .innerJoin(schema.checklistRun, eq(schema.runItem.runId, schema.checklistRun.id))
    .where(
      and(
        eq(schema.checklistRun.businessDate, today),
        eq(schema.checklistItem.required, true),
        isNull(schema.runItem.completedAt),
      ),
    );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-white/40">{formatBusinessDate(today)}</p>
        <h1 className="mt-1 text-2xl font-semibold">Tonight&rsquo;s shifts</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total" value={runs.length} />
        <Stat label="Completed" value={done} accent="emerald" />
        <Stat label="In progress" value={inProgress} accent="amber" />
        <Stat label="Active checklists" value={expectedToday.length} />
      </div>

      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">Activity</h2>
          <Link href="/admin/history" className="text-xs text-white/60 hover:text-white">
            All history →
          </Link>
        </div>
        {runs.length === 0 ? (
          <p className="text-sm text-white/50">No shifts started yet today.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {runs.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <span className="font-medium text-white">{r.staffName}</span>{" "}
                  <span className="text-white/50">
                    · {r.roleName} · {r.shiftType}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {r.completedAt ? (
                    <span className="rounded bg-emerald-400/15 px-2 py-0.5 text-xs text-emerald-300">
                      Signed off
                    </span>
                  ) : (
                    <span className="rounded bg-amber-400/15 px-2 py-0.5 text-xs text-amber-300">
                      In progress
                    </span>
                  )}
                  <Link href={`/admin/history/${r.id}`} className="text-xs text-white/60 hover:text-white">
                    View
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2 className="mb-3 font-medium">Outstanding required items today</h2>
        {missingToday.length === 0 ? (
          <p className="text-sm text-white/50">None — looking good.</p>
        ) : (
          <ul className="space-y-1 text-sm text-white/70">
            {missingToday.slice(0, 25).map((m, i) => (
              <li key={i}>• {m.label}</li>
            ))}
            {missingToday.length > 25 ? (
              <li className="text-white/40">…and {missingToday.length - 25} more</li>
            ) : null}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "emerald" | "amber";
}) {
  const color =
    accent === "emerald"
      ? "text-emerald-300"
      : accent === "amber"
        ? "text-amber-300"
        : "text-white";
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-widest text-white/40">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}
