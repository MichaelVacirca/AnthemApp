import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  date,
  pgEnum,
  primaryKey,
  uniqueIndex,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const shiftTypeEnum = pgEnum("shift_type", ["opening", "closing"]);

export const staff = pgTable(
  "staff",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    pinHash: text("pin_hash").notNull(),
    isManager: boolean("is_manager").notNull().default(false),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    activeIdx: index("staff_active_idx").on(t.active),
  }),
);

export const role = pgTable(
  "role",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    nameIdx: uniqueIndex("role_name_idx").on(t.name),
  }),
);

export const staffRole = pgTable(
  "staff_role",
  {
    staffId: uuid("staff_id")
      .notNull()
      .references(() => staff.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => role.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.staffId, t.roleId] }),
  }),
);

export const checklist = pgTable(
  "checklist",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roleId: uuid("role_id")
      .notNull()
      .references(() => role.id, { onDelete: "cascade" }),
    shiftType: shiftTypeEnum("shift_type").notNull(),
    name: text("name").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    roleShiftIdx: uniqueIndex("checklist_role_shift_idx").on(t.roleId, t.shiftType),
  }),
);

export const checklistItem = pgTable("checklist_item", {
  id: uuid("id").defaultRandom().primaryKey(),
  checklistId: uuid("checklist_id")
    .notNull()
    .references(() => checklist.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  position: integer("position").notNull().default(0),
  required: boolean("required").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const checklistRun = pgTable(
  "checklist_run",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    staffId: uuid("staff_id")
      .notNull()
      .references(() => staff.id, { onDelete: "restrict" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => role.id, { onDelete: "restrict" }),
    checklistId: uuid("checklist_id")
      .notNull()
      .references(() => checklist.id, { onDelete: "restrict" }),
    shiftType: shiftTypeEnum("shift_type").notNull(),
    businessDate: date("business_date").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    notes: text("notes"),
  },
  (t) => ({
    businessDateIdx: index("run_business_date_idx").on(t.businessDate),
    staffIdx: index("run_staff_idx").on(t.staffId),
  }),
);

export const runItem = pgTable(
  "run_item",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runId: uuid("run_id")
      .notNull()
      .references(() => checklistRun.id, { onDelete: "cascade" }),
    itemId: uuid("item_id")
      .notNull()
      .references(() => checklistItem.id, { onDelete: "restrict" }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    notes: text("notes"),
  },
  (t) => ({
    runItemIdx: uniqueIndex("run_item_unique_idx").on(t.runId, t.itemId),
  }),
);

export const authAttempt = pgTable(
  "auth_attempt",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ip: text("ip").notNull(),
    succeeded: boolean("succeeded").notNull(),
    attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ipTimeIdx: index("auth_attempt_ip_time_idx").on(t.ip, t.attemptedAt),
  }),
);

export const adminAction = pgTable(
  "admin_action",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    staffId: uuid("staff_id").references(() => staff.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: uuid("target_id"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    createdAtIdx: index("admin_action_created_at_idx").on(t.createdAt),
    staffIdx: index("admin_action_staff_idx").on(t.staffId),
  }),
);

export const staffRelations = relations(staff, ({ many }) => ({
  staffRoles: many(staffRole),
  runs: many(checklistRun),
}));

export const roleRelations = relations(role, ({ many }) => ({
  staffRoles: many(staffRole),
  checklists: many(checklist),
}));

export const staffRoleRelations = relations(staffRole, ({ one }) => ({
  staff: one(staff, { fields: [staffRole.staffId], references: [staff.id] }),
  role: one(role, { fields: [staffRole.roleId], references: [role.id] }),
}));

export const checklistRelations = relations(checklist, ({ one, many }) => ({
  role: one(role, { fields: [checklist.roleId], references: [role.id] }),
  items: many(checklistItem),
}));

export const checklistItemRelations = relations(checklistItem, ({ one }) => ({
  checklist: one(checklist, { fields: [checklistItem.checklistId], references: [checklist.id] }),
}));

export const checklistRunRelations = relations(checklistRun, ({ one, many }) => ({
  staff: one(staff, { fields: [checklistRun.staffId], references: [staff.id] }),
  role: one(role, { fields: [checklistRun.roleId], references: [role.id] }),
  checklist: one(checklist, { fields: [checklistRun.checklistId], references: [checklist.id] }),
  runItems: many(runItem),
}));

export const runItemRelations = relations(runItem, ({ one }) => ({
  run: one(checklistRun, { fields: [runItem.runId], references: [checklistRun.id] }),
  item: one(checklistItem, { fields: [runItem.itemId], references: [checklistItem.id] }),
}));

export type Staff = typeof staff.$inferSelect;
export type Role = typeof role.$inferSelect;
export type Checklist = typeof checklist.$inferSelect;
export type ChecklistItem = typeof checklistItem.$inferSelect;
export type ChecklistRun = typeof checklistRun.$inferSelect;
export type RunItem = typeof runItem.$inferSelect;
export type ShiftType = (typeof shiftTypeEnum.enumValues)[number];
