import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import ChecklistsManager from "./ChecklistsManager";

export const dynamic = "force-dynamic";

export default async function ChecklistsPage() {
  const [roles, checklists, items] = await Promise.all([
    db.select().from(schema.role).orderBy(asc(schema.role.name)),
    db.select().from(schema.checklist).orderBy(asc(schema.checklist.name)),
    db
      .select()
      .from(schema.checklistItem)
      .orderBy(asc(schema.checklistItem.position)),
  ]);

  if (roles.length === 0) {
    return (
      <div className="card max-w-lg">
        <h1 className="text-xl font-semibold">No roles yet</h1>
        <p className="mt-2 text-sm text-white/60">
          Create at least one role first, then you can build a checklist for it.
        </p>
        <Link href="/admin/roles" className="btn mt-4 inline-block">
          Go to roles
        </Link>
      </div>
    );
  }

  const data = checklists.map((c) => ({
    ...c,
    role: roles.find((r) => r.id === c.roleId)!,
    items: items.filter((i) => i.checklistId === c.id),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Checklists</h1>
        <p className="mt-1 text-sm text-white/60">
          One checklist per role per shift. Add or reorder items at any time.
        </p>
      </div>
      <ChecklistsManager roles={roles} checklists={data} />
    </div>
  );
}
