import { db, schema } from "@/db";
import { readStaffSession } from "@/lib/staff-session";

export type AuditAction =
  | "staff.create"
  | "staff.update"
  | "staff.deactivate"
  | "staff.reactivate"
  | "role.create"
  | "role.rename"
  | "role.delete"
  | "checklist.create"
  | "checklist.update"
  | "checklist.delete"
  | "checklist_item.create"
  | "checklist_item.update"
  | "checklist_item.delete"
  | "checklist_item.move";

export type AuditTargetType = "staff" | "role" | "checklist" | "checklist_item";

export async function logAdminAction(opts: {
  action: AuditAction;
  targetType: AuditTargetType;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    const staffId = await readStaffSession();
    await db.insert(schema.adminAction).values({
      staffId: staffId ?? null,
      action: opts.action,
      targetType: opts.targetType,
      targetId: opts.targetId ?? null,
      metadata: opts.metadata ?? null,
    });
  } catch (err) {
    console.error("audit log failed", { action: opts.action, err });
  }
}
