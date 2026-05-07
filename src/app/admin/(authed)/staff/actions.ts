"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { hashPin, isValidPin, verifyPin } from "@/lib/pin";
import { logAdminAction } from "@/lib/audit";

const Create = z.object({
  name: z.string().trim().min(1).max(80),
  pin: z.string(),
  isManager: z.preprocess((v) => v === "on" || v === true, z.boolean()).optional(),
  roleIds: z.array(z.string().uuid()).optional(),
});

export async function createStaff(formData: FormData) {
  const parsed = Create.safeParse({
    name: formData.get("name"),
    pin: formData.get("pin"),
    isManager: formData.get("isManager"),
    roleIds: formData.getAll("roleIds"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Please provide a name and a 4-6 digit PIN." } as const;
  }
  const { name, pin, isManager, roleIds } = parsed.data;
  if (!isValidPin(pin)) {
    return { ok: false, error: "PIN must be 4-6 digits." } as const;
  }

  const existing = await db
    .select()
    .from(schema.staff)
    .where(eq(schema.staff.active, true));
  for (const s of existing) {
    if (await verifyPin(pin, s.pinHash)) {
      return { ok: false, error: "That PIN is already in use." } as const;
    }
  }

  const pinHash = await hashPin(pin);
  const createdId = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(schema.staff)
      .values({ name, pinHash, isManager: !!isManager })
      .returning({ id: schema.staff.id });
    if (roleIds?.length) {
      await tx
        .insert(schema.staffRole)
        .values(roleIds.map((roleId) => ({ staffId: created.id, roleId })));
    }
    return created.id;
  });
  await logAdminAction({
    action: "staff.create",
    targetType: "staff",
    targetId: createdId,
    metadata: { name, isManager: !!isManager, roleIds: roleIds ?? [] },
  });
  revalidatePath("/admin/staff");
  return { ok: true } as const;
}

const Update = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
  pin: z.string().optional(),
  active: z.preprocess((v) => v === "on" || v === true, z.boolean()).optional(),
  isManager: z.preprocess((v) => v === "on" || v === true, z.boolean()).optional(),
  roleIds: z.array(z.string().uuid()).optional(),
});

export async function updateStaff(formData: FormData) {
  const parsed = Update.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    pin: formData.get("pin"),
    active: formData.get("active"),
    isManager: formData.get("isManager"),
    roleIds: formData.getAll("roleIds"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Invalid input." } as const;
  }
  const { id, name, pin, active, isManager, roleIds } = parsed.data;

  const update: Partial<typeof schema.staff.$inferInsert> = {
    name,
    active: !!active,
    isManager: !!isManager,
  };
  if (pin && pin.length > 0) {
    if (!isValidPin(pin)) {
      return { ok: false, error: "PIN must be 4-6 digits." } as const;
    }
    const others = await db.select().from(schema.staff);
    for (const s of others) {
      if (s.id === id) continue;
      if (await verifyPin(pin, s.pinHash)) {
        return { ok: false, error: "That PIN is already in use." } as const;
      }
    }
    update.pinHash = await hashPin(pin);
  }

  await db.transaction(async (tx) => {
    await tx.update(schema.staff).set(update).where(eq(schema.staff.id, id));
    await tx.delete(schema.staffRole).where(eq(schema.staffRole.staffId, id));
    if (roleIds?.length) {
      await tx
        .insert(schema.staffRole)
        .values(roleIds.map((roleId) => ({ staffId: id, roleId })));
    }
  });
  await logAdminAction({
    action: "staff.update",
    targetType: "staff",
    targetId: id,
    metadata: {
      name,
      active: !!active,
      isManager: !!isManager,
      roleIds: roleIds ?? [],
      pinChanged: !!(pin && pin.length > 0),
    },
  });
  revalidatePath("/admin/staff");
  return { ok: true } as const;
}

export async function deactivateStaff(formData: FormData) {
  const id = String(formData.get("id"));
  await db.update(schema.staff).set({ active: false }).where(eq(schema.staff.id, id));
  await logAdminAction({ action: "staff.deactivate", targetType: "staff", targetId: id });
  revalidatePath("/admin/staff");
}

export async function reactivateStaff(formData: FormData) {
  const id = String(formData.get("id"));
  await db.update(schema.staff).set({ active: true }).where(eq(schema.staff.id, id));
  await logAdminAction({ action: "staff.reactivate", targetType: "staff", targetId: id });
  revalidatePath("/admin/staff");
}

export async function getStaffRoles(staffId: string) {
  return db
    .select({ roleId: schema.staffRole.roleId })
    .from(schema.staffRole)
    .where(eq(schema.staffRole.staffId, staffId));
}
