import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import RolesManager from "./RolesManager";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const roles = await db.select().from(schema.role).orderBy(asc(schema.role.name));
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Roles</h1>
        <p className="mt-1 text-sm text-white/60">
          Roles map to the job a staff member is clocked in as (e.g. Bartender, Barback, Server).
        </p>
      </div>
      <RolesManager roles={roles} />
    </div>
  );
}
