import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq } from "drizzle-orm";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import * as schema from "../../src/db/schema";

const url = process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) {
  throw new Error("E2E_DATABASE_URL or DATABASE_URL must be set for tests");
}

const client = postgres(url, { max: 1 });
const db = drizzle(client, { schema });

export async function resetAuthAttempts(): Promise<void> {
  await db.delete(schema.authAttempt);
}

export async function clearAdminActions(): Promise<void> {
  await db.delete(schema.adminAction);
}

async function findStaffByPin(pin: string) {
  const all = await db.select().from(schema.staff);
  for (const s of all) {
    if (await bcrypt.compare(pin, s.pinHash)) return s;
  }
  return null;
}

export async function ensureManagerPin(pin: string): Promise<void> {
  const existing = await findStaffByPin(pin);
  if (existing) {
    if (!existing.isManager || !existing.active) {
      await db
        .update(schema.staff)
        .set({ isManager: true, active: true })
        .where(eq(schema.staff.id, existing.id));
    }
    return;
  }
  const pinHash = await bcrypt.hash(pin, 10);
  await db.insert(schema.staff).values({
    name: "E2E Manager",
    pinHash,
    isManager: true,
  });
}

export async function ensureStaffPin(
  pin: string,
  opts: { roleName: string; name?: string },
): Promise<{ staffId: string; roleId: string }> {
  let role = await db.query.role.findFirst({ where: eq(schema.role.name, opts.roleName) });
  if (!role) {
    const [created] = await db
      .insert(schema.role)
      .values({ name: opts.roleName })
      .returning();
    role = created;
  }

  let staff = await findStaffByPin(pin);
  if (staff) {
    if (staff.isManager || !staff.active) {
      await db
        .update(schema.staff)
        .set({ isManager: false, active: true })
        .where(eq(schema.staff.id, staff.id));
    }
  } else {
    const pinHash = await bcrypt.hash(pin, 10);
    const [created] = await db
      .insert(schema.staff)
      .values({ name: opts.name ?? "E2E Staff", pinHash, isManager: false })
      .returning();
    staff = created;
  }

  const link = await db.query.staffRole.findFirst({
    where: and(
      eq(schema.staffRole.staffId, staff.id),
      eq(schema.staffRole.roleId, role.id),
    ),
  });
  if (!link) {
    await db.insert(schema.staffRole).values({ staffId: staff.id, roleId: role.id });
  }
  return { staffId: staff.id, roleId: role.id };
}

export async function ensureChecklist(
  roleId: string,
  shiftType: "opening" | "closing",
  items: { label: string; required: boolean }[],
): Promise<void> {
  let checklist = await db.query.checklist.findFirst({
    where: and(eq(schema.checklist.roleId, roleId), eq(schema.checklist.shiftType, shiftType)),
  });
  if (!checklist) {
    const [created] = await db
      .insert(schema.checklist)
      .values({
        roleId,
        shiftType,
        name: `E2E ${shiftType}`,
      })
      .returning();
    checklist = created;
  }
  const existing = await db.query.checklistItem.findMany({
    where: eq(schema.checklistItem.checklistId, checklist.id),
  });
  if (existing.length === 0) {
    await db
      .insert(schema.checklistItem)
      .values(
        items.map((it, i) => ({
          checklistId: checklist!.id,
          label: it.label,
          position: i,
          required: it.required,
        })),
      );
  }
}
