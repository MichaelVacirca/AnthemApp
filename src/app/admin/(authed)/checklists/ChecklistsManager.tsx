"use client";

import { useActionState, useState } from "react";
import {
  createChecklist,
  updateChecklist,
  deleteChecklist,
  addItem,
  updateItem,
  deleteItem,
  moveItem,
} from "./actions";

type Role = { id: string; name: string };
type Item = {
  id: string;
  checklistId: string;
  label: string;
  position: number;
  required: boolean;
};
type Checklist = {
  id: string;
  roleId: string;
  shiftType: "opening" | "closing";
  name: string;
  active: boolean;
  role: Role;
  items: Item[];
};
type Result = { ok: boolean; error?: string } | null;
const initial: Result = null;

async function createChecklistAction(_p: Result, fd: FormData): Promise<Result> {
  return createChecklist(fd);
}
async function updateChecklistAction(_p: Result, fd: FormData): Promise<Result> {
  return updateChecklist(fd);
}
async function addItemAction(_p: Result, fd: FormData): Promise<Result> {
  return addItem(fd);
}

export default function ChecklistsManager({
  roles,
  checklists,
}: {
  roles: Role[];
  checklists: Checklist[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(checklists[0]?.id ?? null);
  const selected = checklists.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-4">
        <NewChecklistForm roles={roles} />
        <div>
          <h3 className="mb-2 text-xs uppercase tracking-widest text-white/40">Existing</h3>
          {checklists.length === 0 ? (
            <p className="text-sm text-white/50">None yet.</p>
          ) : (
            <ul className="space-y-1">
              {checklists.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setSelectedId(c.id)}
                    className={`block w-full rounded-md px-3 py-2 text-left text-sm ${
                      selectedId === c.id ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5"
                    }`}
                  >
                    <span className="block font-medium">{c.name}</span>
                    <span className="text-xs text-white/50">
                      {c.role.name} · {c.shiftType}
                      {c.active ? "" : " · inactive"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <section>
        {selected ? <ChecklistEditor checklist={selected} /> : (
          <p className="text-sm text-white/50">
            Select a checklist on the left, or create one to get started.
          </p>
        )}
      </section>
    </div>
  );
}

function NewChecklistForm({ roles }: { roles: Role[] }) {
  const [state, action, pending] = useActionState(createChecklistAction, initial);
  return (
    <form action={action} className="card space-y-3" key={state?.ok ? "reset" : undefined}>
      <h3 className="text-sm font-medium">New checklist</h3>
      <div>
        <label className="label">Role</label>
        <select name="roleId" required className="input">
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Shift</label>
        <select name="shiftType" required className="input">
          <option value="opening">Opening</option>
          <option value="closing">Closing</option>
        </select>
      </div>
      <div>
        <label className="label">Name</label>
        <input name="name" required className="input" placeholder="Bartender · Closing" />
      </div>
      {state?.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
      <button className="btn w-full" disabled={pending}>
        {pending ? "Creating…" : "Create"}
      </button>
    </form>
  );
}

function ChecklistEditor({ checklist }: { checklist: Checklist }) {
  return (
    <div className="space-y-5">
      <ChecklistHeader checklist={checklist} />
      <ItemsList checklist={checklist} />
      <AddItemForm checklistId={checklist.id} />
    </div>
  );
}

function ChecklistHeader({ checklist }: { checklist: Checklist }) {
  const [state, action, pending] = useActionState(updateChecklistAction, initial);
  return (
    <div className="card">
      <form action={action} className="space-y-3">
        <input type="hidden" name="id" value={checklist.id} />
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className="label">Name</label>
            <input
              name="name"
              defaultValue={checklist.name}
              required
              className="input"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-white/70 mb-3">
            <input type="checkbox" name="active" defaultChecked={checklist.active} /> Active
          </label>
          <button className="btn mb-0" disabled={pending}>
            {pending ? "…" : "Save"}
          </button>
        </div>
        <p className="text-xs text-white/40">
          {checklist.role.name} · {checklist.shiftType}
        </p>
        {state?.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
      </form>
      <form
        action={deleteChecklist}
        className="mt-3 border-t border-white/5 pt-3"
        onSubmit={(e) => {
          if (
            !confirm(
              `Delete "${checklist.name}"? Past sign-off history will be kept but new shifts can't use this checklist.`,
            )
          )
            e.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={checklist.id} />
        <button className="text-xs uppercase tracking-widest text-red-400 hover:text-red-300">
          Delete checklist
        </button>
      </form>
    </div>
  );
}

function ItemsList({ checklist }: { checklist: Checklist }) {
  if (checklist.items.length === 0) {
    return <p className="text-sm text-white/50">No items yet — add one below.</p>;
  }
  return (
    <ul className="space-y-2">
      {checklist.items.map((item, idx) => (
        <ItemRow
          key={item.id}
          item={item}
          isFirst={idx === 0}
          isLast={idx === checklist.items.length - 1}
        />
      ))}
    </ul>
  );
}

function ItemRow({
  item,
  isFirst,
  isLast,
}: {
  item: Item;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (editing) {
    return (
      <li className="card">
        <form
          action={async (fd) => {
            setPending(true);
            setError(null);
            const r = await updateItem(fd);
            setPending(false);
            if (r?.ok) setEditing(false);
            else if (r?.error) setError(r.error);
          }}
          className="space-y-2"
        >
          <input type="hidden" name="id" value={item.id} />
          <input name="label" defaultValue={item.label} required className="input" />
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input type="checkbox" name="required" defaultChecked={item.required} /> Required
          </label>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <div className="flex gap-2">
            <button className="btn" disabled={pending}>
              {pending ? "…" : "Save"}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="card flex items-start gap-3">
      <div className="flex flex-col gap-1">
        <form action={moveItem}>
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="direction" value="up" />
          <button
            disabled={isFirst}
            className="rounded bg-white/5 px-2 py-1 text-xs text-white/70 disabled:opacity-30"
            aria-label="Move up"
          >
            ↑
          </button>
        </form>
        <form action={moveItem}>
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="direction" value="down" />
          <button
            disabled={isLast}
            className="rounded bg-white/5 px-2 py-1 text-xs text-white/70 disabled:opacity-30"
            aria-label="Move down"
          >
            ↓
          </button>
        </form>
      </div>
      <div className="flex-1">
        <p>
          {item.label}
          {!item.required ? (
            <span className="ml-2 rounded bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-white/50">
              Optional
            </span>
          ) : null}
        </p>
      </div>
      <button onClick={() => setEditing(true)} className="btn-secondary px-3 py-2 text-sm">
        Edit
      </button>
      <form
        action={deleteItem}
        onSubmit={(e) => {
          if (!confirm("Delete this item?")) e.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={item.id} />
        <button className="btn-danger px-3 py-2 text-sm">Delete</button>
      </form>
    </li>
  );
}

function AddItemForm({ checklistId }: { checklistId: string }) {
  const [state, action, pending] = useActionState(addItemAction, initial);
  return (
    <form
      action={action}
      className="card space-y-3"
      key={state?.ok ? "reset" : undefined}
    >
      <h3 className="text-sm font-medium">Add item</h3>
      <input type="hidden" name="checklistId" value={checklistId} />
      <div>
        <label className="label">Label</label>
        <input name="label" required className="input" placeholder="Wipe down bar top" />
      </div>
      <label className="flex items-center gap-2 text-sm text-white/70">
        <input type="checkbox" name="required" defaultChecked /> Required to sign off
      </label>
      {state?.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
      <button className="btn" disabled={pending}>
        {pending ? "Adding…" : "Add item"}
      </button>
    </form>
  );
}
