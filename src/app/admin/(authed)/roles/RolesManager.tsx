"use client";

import { useActionState, useState } from "react";
import { createRole, renameRole, deleteRole } from "./actions";

type Role = { id: string; name: string };
type Result = { ok: boolean; error?: string } | null;
const initial: Result = null;

async function createAction(_prev: Result, fd: FormData): Promise<Result> {
  return createRole(fd);
}
async function renameAction(_prev: Result, fd: FormData): Promise<Result> {
  return renameRole(fd);
}

export default function RolesManager({ roles }: { roles: Role[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [createState, createA, createPending] = useActionState(createAction, initial);

  return (
    <div className="space-y-6">
      <section className="card">
        <h2 className="mb-3 font-medium">Add role</h2>
        <form action={createA} className="flex flex-wrap gap-2">
          <input
            name="name"
            placeholder="Bartender"
            className="input flex-1 min-w-[160px]"
            required
          />
          <button className="btn" disabled={createPending}>
            {createPending ? "Adding…" : "Add"}
          </button>
        </form>
        {createState?.error ? <p className="mt-2 text-sm text-red-400">{createState.error}</p> : null}
      </section>

      <section>
        <h2 className="mb-3 font-medium">Existing roles</h2>
        {roles.length === 0 ? (
          <p className="text-sm text-white/50">None yet.</p>
        ) : (
          <ul className="space-y-2">
            {roles.map((r) => (
              <li key={r.id} className="card">
                {editing === r.id ? (
                  <RenameForm role={r} onClose={() => setEditing(null)} />
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="flex-1">{r.name}</span>
                    <button onClick={() => setEditing(r.id)} className="btn-secondary px-3 py-2 text-sm">
                      Rename
                    </button>
                    <form
                      action={deleteRole}
                      onSubmit={(e) => {
                        if (!confirm(`Delete ${r.name}? This removes any checklists for it.`))
                          e.preventDefault();
                      }}
                    >
                      <input type="hidden" name="id" value={r.id} />
                      <button className="btn-danger px-3 py-2 text-sm">Delete</button>
                    </form>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function RenameForm({ role, onClose }: { role: Role; onClose: () => void }) {
  const [state, action, pending] = useActionState(renameAction, initial);
  return (
    <form action={action} className="flex flex-wrap gap-2">
      <input type="hidden" name="id" value={role.id} />
      <input name="name" defaultValue={role.name} className="input flex-1 min-w-[160px]" required />
      <button className="btn" disabled={pending}>
        {pending ? "…" : "Save"}
      </button>
      <button type="button" onClick={onClose} className="btn-secondary">
        Cancel
      </button>
      {state?.error ? <p className="basis-full text-sm text-red-400">{state.error}</p> : null}
    </form>
  );
}
