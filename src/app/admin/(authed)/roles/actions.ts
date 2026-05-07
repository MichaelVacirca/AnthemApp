"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { logAdminAction } from "@/lib/audit";

const Create = z.object({ name: z.string().trim().min(1).max(60) });

export async function createRole(formData: FormData) {
  const parsed = Create.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { ok: false, error: "Provide a role name." } as const;
  let createdId: string | null = null;
  try {
    const [created] = await db
      .insert(schema.role)
      .values({ name: parsed.data.name })
      .returning({ id: schema.role.id });
    createdId = created.id;
  } catch {
    return { ok: false, error: "A role with that name already exists." } as const;
  }
  await logAdminAction({
    action: "role.create",
    targetType: "role",
    targetId: createdId,
    metadata: { name: parsed.data.name },
  });
  revalidatePath("/admin/roles");
  revalidatePath("/admin/staff");
  revalidatePath("/admin/checklists");
  return { ok: true } as const;
}

const Rename = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(60),
});

export async function renameRole(formData: FormData) {
  const parsed = Rename.safeParse({ id: formData.get("id"), name: formData.get("name") });
  if (!parsed.success) return { ok: false, error: "Invalid input." } as const;
  await db.update(schema.role).set({ name: parsed.data.name }).where(eq(schema.role.id, parsed.data.id));
  await logAdminAction({
    action: "role.rename",
    targetType: "role",
    targetId: parsed.data.id,
    metadata: { name: parsed.data.name },
  });
  revalidatePath("/admin/roles");
  revalidatePath("/admin/staff");
  revalidatePath("/admin/checklists");
  return { ok: true } as const;
}

export async function deleteRole(formData: FormData) {
  const id = String(formData.get("id"));
  await db.delete(schema.role).where(eq(schema.role.id, id));
  await logAdminAction({ action: "role.delete", targetType: "role", targetId: id });
  revalidatePath("/admin/roles");
  revalidatePath("/admin/staff");
  revalidatePath("/admin/checklists");
}
