import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { formatBusinessDate } from "@/lib/business-date";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const runs = await db
    .select({
      id: schema.checklistRun.id,
      shiftType: schema.checklistRun.shiftType,
      businessDate: schema.checklistRun.businessDate,
      startedAt: schema.checklistRun.startedAt,
      completedAt: schema.checklistRun.completedAt,
      staffName: schema.staff.name,
      roleName: schema.role.name,
      checklistName: schema.checklist.name,
    })
    .from(schema.checklistRun)
    .innerJoin(schema.staff, eq(schema.checklistRun.staffId, schema.staff.id))
    .innerJoin(schema.role, eq(schema.checklistRun.roleId, schema.role.id))
    .innerJoin(schema.checklist, eq(schema.checklistRun.checklistId, schema.checklist.id))
    .orderBy(desc(schema.checklistRun.startedAt))
    .limit(200);

  const grouped = runs.reduce<Record<string, typeof runs>>((acc, r) => {
    (acc[r.businessDate] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">History</h1>
        <p className="mt-1 text-sm text-white/60">Most recent 200 shifts.</p>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <p className="text-sm text-white/50">Nothing yet.</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, list]) => (
            <section key={date}>
              <h2 className="mb-2 text-xs uppercase tracking-widest text-white/50">
                {formatBusinessDate(date)}
              </h2>
              <ul className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
                {list.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                    <div className="flex-1 min-w-[160px]">
                      <p className="font-medium">{r.staffName}</p>
                      <p className="text-xs text-white/50">
                        {r.roleName} · {r.shiftType}
                      </p>
                    </div>
                    <div className="text-xs text-white/60">
                      {new Date(r.startedAt).toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                      {r.completedAt
                        ? ` → ${new Date(r.completedAt).toLocaleTimeString(undefined, {
                            hour: "numeric",
                            minute: "2-digit",
                          })}`
                        : ""}
                    </div>
                    {r.completedAt ? (
                      <span className="rounded bg-emerald-400/15 px-2 py-0.5 text-xs text-emerald-300">
                        Signed off
                      </span>
                    ) : (
                      <span className="rounded bg-amber-400/15 px-2 py-0.5 text-xs text-amber-300">
                        Incomplete
                      </span>
                    )}
                    <Link href={`/admin/history/${r.id}`} className="text-xs text-white/60 hover:text-white">
                      View →
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
