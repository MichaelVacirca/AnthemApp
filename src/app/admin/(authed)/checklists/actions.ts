"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq, sql, max } from "drizzle-orm";
import { db, schema } from "@/db";
import { logAdminAction } from "@/lib/audit";

const Create = z.object({
  roleId: z.string().uuid(),
  shiftType: z.enum(["opening", "closing"]),
  name: z.string().trim().min(1).max(120),
});

export async function createChecklist(formData: FormData) {
  const parsed = Create.safeParse({
    roleId: formData.get("roleId"),
    shiftType: formData.get("shiftType"),
    name: formData.get("name"),
  });
  if (!parsed.success) return { ok: false, error: "Invalid input." } as const;
  let createdId: string | null = null;
  try {
    const [created] = await db
      .insert(schema.checklist)
      .values(parsed.data)
      .returning({ id: schema.checklist.id });
    createdId = created.id;
  } catch {
    return {
      ok: false,
      error: "A checklist already exists for that role + shift.",
    } as const;
  }
  await logAdminAction({
    action: "checklist.create",
    targetType: "checklist",
    targetId: createdId,
    metadata: parsed.data,
  });
  revalidatePath("/admin/checklists");
  return { ok: true } as const;
}

const Rename = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  active: z.preprocess((v) => v === "on" || v === true, z.boolean()).optional(),
});

export async function updateChecklist(formData: FormData) {
  const parsed = Rename.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    active: formData.get("active"),
  });
  if (!parsed.success) return { ok: false, error: "Invalid input." } as const;
  await db
    .update(schema.checklist)
    .set({ name: parsed.data.name, active: !!parsed.data.active })
    .where(eq(schema.checklist.id, parsed.data.id));
  await logAdminAction({
    action: "checklist.update",
    targetType: "checklist",
    targetId: parsed.data.id,
    metadata: { name: parsed.data.name, active: !!parsed.data.active },
  });
  revalidatePath("/admin/checklists");
  return { ok: true } as const;
}

export async function deleteChecklist(formData: FormData) {
  const id = String(formData.get("id"));
  await db.delete(schema.checklist).where(eq(schema.checklist.id, id));
  await logAdminAction({ action: "checklist.delete", targetType: "checklist", targetId: id });
  revalidatePath("/admin/checklists");
}

const AddItem = z.object({
  checklistId: z.string().uuid(),
  label: z.string().trim().min(1).max(240),
  required: z.preprocess((v) => v === "on" || v === true, z.boolean()).optional(),
});

export async function addItem(formData: FormData) {
  const parsed = AddItem.safeParse({
    checklistId: formData.get("checklistId"),
    label: formData.get("label"),
    required: formData.get("required"),
  });
  if (!parsed.success) return { ok: false, error: "Invalid input." } as const;

  const [{ maxPos }] = await db
    .select({ maxPos: max(schema.checklistItem.position) })
    .from(schema.checklistItem)
    .where(eq(schema.checklistItem.checklistId, parsed.data.checklistId));

  const [created] = await db
    .insert(schema.checklistItem)
    .values({
      checklistId: parsed.data.checklistId,
      label: parsed.data.label,
      required: parsed.data.required ?? true,
      position: (maxPos ?? -1) + 1,
    })
    .returning({ id: schema.checklistItem.id });
  await logAdminAction({
    action: "checklist_item.create",
    targetType: "checklist_item",
    targetId: created.id,
    metadata: {
      checklistId: parsed.data.checklistId,
      label: parsed.data.label,
      required: parsed.data.required ?? true,
    },
  });
  revalidatePath("/admin/checklists");
  return { ok: true } as const;
}

const UpdateItem = z.object({
  id: z.string().uuid(),
  label: z.string().trim().min(1).max(240),
  required: z.preprocess((v) => v === "on" || v === true, z.boolean()).optional(),
});

export async function updateItem(formData: FormData) {
  const parsed = UpdateItem.safeParse({
    id: formData.get("id"),
    label: formData.get("label"),
    required: formData.get("required"),
  });
  if (!parsed.success) return { ok: false, error: "Invalid input." } as const;
  await db
    .update(schema.checklistItem)
    .set({ label: parsed.data.label, required: !!parsed.data.required })
    .where(eq(schema.checklistItem.id, parsed.data.id));
  await logAdminAction({
    action: "checklist_item.update",
    targetType: "checklist_item",
    targetId: parsed.data.id,
    metadata: { label: parsed.data.label, required: !!parsed.data.required },
  });
  revalidatePath("/admin/checklists");
  return { ok: true } as const;
}

export async function deleteItem(formData: FormData) {
  const id = String(formData.get("id"));
  await db.delete(schema.checklistItem).where(eq(schema.checklistItem.id, id));
  await logAdminAction({
    action: "checklist_item.delete",
    targetType: "checklist_item",
    targetId: id,
  });
  revalidatePath("/admin/checklists");
}

export async function moveItem(formData: FormData) {
  const id = String(formData.get("id"));
  const direction = formData.get("direction") === "up" ? "up" : "down";

  const item = await db.query.checklistItem.findFirst({
    where: eq(schema.checklistItem.id, id),
  });
  if (!item) return;

  const siblings = await db
    .select()
    .from(schema.checklistItem)
    .where(eq(schema.checklistItem.checklistId, item.checklistId));

  siblings.sort((a, b) => a.position - b.position);
  const idx = siblings.findIndex((s) => s.id === id);
  const swapWith = direction === "up" ? siblings[idx - 1] : siblings[idx + 1];
  if (!swapWith) return;

  await db.transaction(async (tx) => {
    await tx
      .update(schema.checklistItem)
      .set({ position: sql`${swapWith.position}` })
      .where(eq(schema.checklistItem.id, item.id));
    await tx
      .update(schema.checklistItem)
      .set({ position: sql`${item.position}` })
      .where(eq(schema.checklistItem.id, swapWith.id));
  });

  await logAdminAction({
    action: "checklist_item.move",
    targetType: "checklist_item",
    targetId: id,
    metadata: { direction, swappedWithId: swapWith.id },
  });
  revalidatePath("/admin/checklists");
}
