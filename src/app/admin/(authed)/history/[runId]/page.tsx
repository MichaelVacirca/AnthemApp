import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { formatBusinessDate } from "@/lib/business-date";

export const dynamic = "force-dynamic";

export default async function RunDetailPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const run = await db.query.checklistRun.findFirst({
    where: eq(schema.checklistRun.id, runId),
  });
  if (!run) notFound();

  const [staff, role, list] = await Promise.all([
    db.query.staff.findFirst({ where: eq(schema.staff.id, run.staffId) }),
    db.query.role.findFirst({ where: eq(schema.role.id, run.roleId) }),
    db.query.checklist.findFirst({ where: eq(schema.checklist.id, run.checklistId) }),
  ]);

  const items = await db
    .select({
      id: schema.checklistItem.id,
      label: schema.checklistItem.label,
      required: schema.checklistItem.required,
      completedAt: schema.runItem.completedAt,
    })
    .from(schema.runItem)
    .innerJoin(schema.checklistItem, eq(schema.runItem.itemId, schema.checklistItem.id))
    .where(eq(schema.runItem.runId, runId))
    .orderBy(asc(schema.checklistItem.position));

  return (
    <div className="space-y-5">
      <Link href="/admin/history" className="text-xs uppercase tracking-widest text-white/40 hover:text-white">
        ← Back to history
      </Link>

      <div>
        <p className="text-xs uppercase tracking-widest text-accent">
          {run.shiftType} · {role?.name}
        </p>
        <h1 className="mt-1 text-2xl font-semibold">{list?.name}</h1>
        <p className="mt-1 text-sm text-white/60">
          {staff?.name} · {formatBusinessDate(run.businessDate)}
        </p>
        <p className="mt-1 text-xs text-white/40">
          Started {new Date(run.startedAt).toLocaleString()}
          {run.completedAt
            ? ` · Completed ${new Date(run.completedAt).toLocaleString()}`
            : " · Not signed off"}
        </p>
      </div>

      <ul className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
        {items.map((i) => (
          <li key={i.id} className="flex items-start gap-3 px-4 py-3 text-sm">
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                i.completedAt ? "border-emerald-400 bg-emerald-400 text-ink" : "border-white/20"
              }`}
              aria-hidden="true"
            >
              {i.completedAt ? "✓" : ""}
            </span>
            <div className="flex-1">
              <p className={i.completedAt ? "text-white/60 line-through" : "text-white"}>
                {i.label}
                {!i.required ? (
                  <span className="ml-2 text-[10px] uppercase tracking-widest text-white/40">
                    Optional
                  </span>
                ) : null}
              </p>
              {i.completedAt ? (
                <p className="text-xs text-white/40">
                  {new Date(i.completedAt).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
