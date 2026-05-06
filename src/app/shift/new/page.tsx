import Link from "next/link";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { and, eq, inArray } from "drizzle-orm";
import { readStaffSession } from "@/lib/staff-session";
import StartShiftForm from "./StartShiftForm";

export const dynamic = "force-dynamic";

export default async function NewShiftPage() {
  const staffId = await readStaffSession();
  if (!staffId) redirect("/");

  const staffRow = await db.query.staff.findFirst({
    where: and(eq(schema.staff.id, staffId), eq(schema.staff.active, true)),
  });
  if (!staffRow) redirect("/");

  const links = await db
    .select({ roleId: schema.staffRole.roleId })
    .from(schema.staffRole)
    .where(eq(schema.staffRole.staffId, staffRow.id));

  const roleIds = links.map((l) => l.roleId);

  const roles = roleIds.length
    ? await db.select().from(schema.role).where(inArray(schema.role.id, roleIds))
    : [];

  const checklists = roleIds.length
    ? await db
        .select()
        .from(schema.checklist)
        .where(and(inArray(schema.checklist.roleId, roleIds), eq(schema.checklist.active, true)))
    : [];

  const available = roles
    .map((r) => ({
      role: r,
      opening: checklists.find((c) => c.roleId === r.id && c.shiftType === "opening"),
      closing: checklists.find((c) => c.roleId === r.id && c.shiftType === "closing"),
    }))
    .filter((r) => r.opening || r.closing);

  return (
    <main className="mx-auto max-w-md px-6 py-10">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-white/40">Hi {staffRow.name}</p>
        <h1 className="mt-1 text-2xl font-semibold">Pick your shift</h1>
        <p className="mt-2 text-sm text-white/60">
          Choose the role you&rsquo;re working tonight and whether you&rsquo;re opening or closing.
        </p>
      </div>

      {available.length === 0 ? (
        <div className="card text-sm text-white/70">
          No checklists are assigned to your roles yet. Ask a manager to set them up.
        </div>
      ) : (
        <StartShiftForm options={available} />
      )}

      <Link href="/" className="mt-8 block text-center text-xs uppercase tracking-widest text-white/40">
        ← Not you? Start over
      </Link>
    </main>
  );
}
