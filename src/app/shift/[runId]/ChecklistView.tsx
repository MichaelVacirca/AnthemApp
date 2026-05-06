"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Item = {
  id: string;
  runItemId: string;
  label: string;
  required: boolean;
  completedAt: string | null;
  notes: string | null;
};

export default function ChecklistView({
  runId,
  items: initial,
  completed,
}: {
  runId: string;
  items: Item[];
  completed: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [signing, setSigning] = useState(false);
  const [done, setDone] = useState(completed);

  const requiredRemaining = useMemo(
    () => items.filter((i) => i.required && !i.completedAt).length,
    [items],
  );
  const totalRemaining = useMemo(() => items.filter((i) => !i.completedAt).length, [items]);
  const percent = items.length === 0 ? 0 : Math.round(((items.length - totalRemaining) / items.length) * 100);

  async function toggle(item: Item) {
    if (done) return;
    const checked = !item.completedAt;
    const optimistic = items.map((i) =>
      i.id === item.id ? { ...i, completedAt: checked ? new Date().toISOString() : null } : i,
    );
    setItems(optimistic);
    setError(null);
    try {
      const res = await fetch(`/api/runs/${runId}/items/${item.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ completed: checked }),
      });
      if (!res.ok) throw new Error("Save failed");
    } catch {
      setItems(items);
      setError("Could not save. Check the connection and try again.");
    }
  }

  async function complete() {
    if (requiredRemaining > 0) {
      setError(`${requiredRemaining} required item${requiredRemaining === 1 ? "" : "s"} still need attention.`);
      return;
    }
    setSigning(true);
    setError(null);
    try {
      const res = await fetch(`/api/runs/${runId}/complete`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not complete shift.");
      }
      setDone(true);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to complete.");
    } finally {
      setSigning(false);
    }
  }

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-white/60">
          <span>
            {items.length - totalRemaining} of {items.length} done
          </span>
          <span>{percent}%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {error ? (
        <p className="mb-3 rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
        {items.map((item) => {
          const checked = Boolean(item.completedAt);
          return (
            <li key={item.id}>
              <button
                onClick={() => toggle(item)}
                disabled={done}
                className={`flex w-full items-start gap-4 px-4 py-4 text-left transition ${
                  checked ? "bg-emerald-400/5" : "hover:bg-white/5"
                } disabled:cursor-default`}
                type="button"
              >
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
                    checked
                      ? "border-emerald-400 bg-emerald-400 text-ink"
                      : "border-white/30 bg-transparent"
                  }`}
                  aria-hidden="true"
                >
                  {checked ? "✓" : ""}
                </span>
                <span className="flex-1">
                  <span
                    className={`block text-base ${
                      checked ? "text-white/50 line-through" : "text-white"
                    }`}
                  >
                    {item.label}
                  </span>
                  {!item.required ? (
                    <span className="mt-1 inline-block rounded bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-white/50">
                      Optional
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {!done ? (
        <div className="fixed inset-x-0 bottom-0 border-t border-white/10 bg-ink/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center gap-3">
            <div className="flex-1 text-sm text-white/60">
              {requiredRemaining > 0
                ? `${requiredRemaining} required item${requiredRemaining === 1 ? "" : "s"} left`
                : "All required items done"}
            </div>
            <button
              onClick={complete}
              disabled={signing || requiredRemaining > 0}
              className="btn disabled:opacity-40"
              type="button"
            >
              {signing ? "Signing off…" : "Sign off shift"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
