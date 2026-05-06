"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Role, Checklist } from "@/db/schema";

type Option = {
  role: Role;
  opening?: Checklist;
  closing?: Checklist;
};

export default function StartShiftForm({ options }: { options: Option[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start(roleId: string, shiftType: "opening" | "closing") {
    const key = `${roleId}-${shiftType}`;
    setBusy(key);
    setError(null);
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ roleId, shiftType }),
      });
      const data = (await res.json()) as { ok: boolean; runId?: string; error?: string };
      if (!res.ok || !data.ok || !data.runId) {
        setError(data.error ?? "Could not start shift.");
        setBusy(null);
        return;
      }
      router.push(`/shift/${data.runId}`);
    } catch {
      setError("Network error.");
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {options.map(({ role, opening, closing }) => (
        <div key={role.id} className="card">
          <h2 className="text-lg font-medium">{role.name}</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              className="btn-secondary disabled:opacity-30"
              disabled={!opening || busy === `${role.id}-opening`}
              onClick={() => opening && start(role.id, "opening")}
              type="button"
            >
              {busy === `${role.id}-opening` ? "…" : "Opening"}
            </button>
            <button
              className="btn disabled:opacity-30"
              disabled={!closing || busy === `${role.id}-closing`}
              onClick={() => closing && start(role.id, "closing")}
              type="button"
            >
              {busy === `${role.id}-closing` ? "…" : "Closing"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
