import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import StaffManager from "./StaffManager";

export const dynamic = "force-dynamic";

export default async function StaffAdminPage() {
  const [staffRows, roles, links] = await Promise.all([
    db.select().from(schema.staff).orderBy(asc(schema.staff.name)),
    db.select().from(schema.role).orderBy(asc(schema.role.name)),
    db.select().from(schema.staffRole),
  ]);

  const staffWithRoles = staffRows.map((s) => ({
    id: s.id,
    name: s.name,
    active: s.active,
    isManager: s.isManager,
    roleIds: links.filter((l) => l.staffId === s.id).map((l) => l.roleId),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Staff</h1>
        <p className="mt-1 text-sm text-white/60">
          Manage staff PINs and which roles they can sign in as.
        </p>
      </div>
      <StaffManager staff={staffWithRoles} roles={roles} />
    </div>
  );
}
