import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const rows = await db
    .select({
      id: schema.adminAction.id,
      action: schema.adminAction.action,
      targetType: schema.adminAction.targetType,
      targetId: schema.adminAction.targetId,
      metadata: schema.adminAction.metadata,
      createdAt: schema.adminAction.createdAt,
      staffName: schema.staff.name,
    })
    .from(schema.adminAction)
    .leftJoin(schema.staff, eq(schema.adminAction.staffId, schema.staff.id))
    .orderBy(desc(schema.adminAction.createdAt))
    .limit(500);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Audit log</h1>
        <p className="mt-1 text-sm text-white/60">
          Most recent 500 admin actions. Logged automatically when managers
          create, update, or delete staff, roles, checklists, and items.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-white/50">No actions logged yet.</p>
      ) : (
        <ul className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
          {rows.map((r) => (
            <li key={r.id} className="px-4 py-3 text-sm">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <code className="rounded bg-white/5 px-1.5 py-0.5 text-xs">{r.action}</code>
                <span className="text-white/70">{r.staffName ?? "unknown"}</span>
                <span className="ml-auto text-xs text-white/50">
                  {new Date(r.createdAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {r.metadata ? (
                <pre className="mt-1 overflow-x-auto text-xs text-white/50">
                  {JSON.stringify(r.metadata, null, 2)}
                </pre>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
