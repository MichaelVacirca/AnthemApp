"use client";

import { useActionState, useState } from "react";
import {
  createStaff,
  updateStaff,
  deactivateStaff,
  reactivateStaff,
} from "./actions";

type StaffRow = {
  id: string;
  name: string;
  active: boolean;
  isManager: boolean;
  roleIds: string[];
};

type RoleRow = { id: string; name: string };

type Result = { ok: boolean; error?: string } | null;

const initialResult: Result = null;

async function createAction(_prev: Result, formData: FormData): Promise<Result> {
  return createStaff(formData);
}

async function updateAction(_prev: Result, formData: FormData): Promise<Result> {
  return updateStaff(formData);
}

export default function StaffManager({
  staff,
  roles,
}: {
  staff: StaffRow[];
  roles: RoleRow[];
}) {
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      <section className="card">
        <h2 className="mb-3 font-medium">Add staff</h2>
        <CreateForm roles={roles} />
      </section>

      <section>
        <h2 className="mb-3 font-medium">Roster</h2>
        {staff.length === 0 ? (
          <p className="text-sm text-white/50">No staff yet.</p>
        ) : (
          <ul className="space-y-2">
            {staff.map((s) => (
              <li key={s.id} className="card">
                {editing === s.id ? (
                  <EditForm
                    staff={s}
                    roles={roles}
                    onClose={() => setEditing(null)}
                  />
                ) : (
                  <Row staff={s} roles={roles} onEdit={() => setEditing(s.id)} />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Row({
  staff,
  roles,
  onEdit,
}: {
  staff: StaffRow;
  roles: RoleRow[];
  onEdit: () => void;
}) {
  const roleNames = staff.roleIds
    .map((id) => roles.find((r) => r.id === id)?.name)
    .filter(Boolean)
    .join(", ");
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex-1">
        <p className="font-medium">
          {staff.name}
          {staff.isManager ? (
            <span className="ml-2 rounded bg-accent/20 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-accent">
              Manager
            </span>
          ) : null}
          {!staff.active ? (
            <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-white/60">
              Inactive
            </span>
          ) : null}
        </p>
        <p className="mt-0.5 text-xs text-white/50">{roleNames || "No roles"}</p>
      </div>
      <button onClick={onEdit} className="btn-secondary px-3 py-2 text-sm">
        Edit
      </button>
      {staff.active ? (
        <form action={deactivateStaff}>
          <input type="hidden" name="id" value={staff.id} />
          <button className="btn-secondary px-3 py-2 text-sm">Deactivate</button>
        </form>
      ) : (
        <form action={reactivateStaff}>
          <input type="hidden" name="id" value={staff.id} />
          <button className="btn-secondary px-3 py-2 text-sm">Reactivate</button>
        </form>
      )}
    </div>
  );
}

function CreateForm({ roles }: { roles: RoleRow[] }) {
  const [state, action, pending] = useActionState(createAction, initialResult);
  return (
    <form
      action={action}
      className="space-y-3"
      key={state?.ok ? "reset" : undefined}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input id="name" name="name" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="pin">PIN (4-6 digits)</label>
          <input
            id="pin"
            name="pin"
            inputMode="numeric"
            pattern="\d{4,6}"
            required
            className="input"
          />
        </div>
      </div>
      <RolesPicker roles={roles} />
      <label className="flex items-center gap-2 text-sm text-white/70">
        <input type="checkbox" name="isManager" /> Manager (can sign in to admin)
      </label>
      {state?.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
      {state?.ok ? <p className="text-sm text-emerald-300">Added.</p> : null}
      <button className="btn" disabled={pending}>
        {pending ? "Saving…" : "Add staff"}
      </button>
    </form>
  );
}

function EditForm({
  staff,
  roles,
  onClose,
}: {
  staff: StaffRow;
  roles: RoleRow[];
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(updateAction, initialResult);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={staff.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Name</label>
          <input
            name="name"
            defaultValue={staff.name}
            required
            className="input"
          />
        </div>
        <div>
          <label className="label">New PIN (leave blank to keep)</label>
          <input
            name="pin"
            inputMode="numeric"
            pattern="\d{4,6}"
            placeholder="••••"
            className="input"
          />
        </div>
      </div>
      <RolesPicker roles={roles} selected={staff.roleIds} />
      <div className="flex flex-wrap gap-4 text-sm text-white/70">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isManager" defaultChecked={staff.isManager} /> Manager
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="active" defaultChecked={staff.active} /> Active
        </label>
      </div>
      {state?.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
      <div className="flex gap-2">
        <button className="btn" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onClose} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}

function RolesPicker({ roles, selected = [] }: { roles: RoleRow[]; selected?: string[] }) {
  if (roles.length === 0) {
    return (
      <p className="text-sm text-white/50">
        No roles defined yet — add them on the Roles page.
      </p>
    );
  }
  return (
    <div>
      <span className="label">Roles</span>
      <div className="flex flex-wrap gap-2">
        {roles.map((r) => (
          <label
            key={r.id}
            className="flex items-center gap-2 rounded-md border border-white/10 px-3 py-1.5 text-sm"
          >
            <input
              type="checkbox"
              name="roleIds"
              value={r.id}
              defaultChecked={selected.includes(r.id)}
            />
            {r.name}
          </label>
        ))}
      </div>
    </div>
  );
}
