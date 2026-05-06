"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"] as const;

export default function PinPad() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function press(key: (typeof KEYS)[number]) {
    setError(null);
    if (key === "clear") return setPin("");
    if (key === "back") return setPin((p) => p.slice(0, -1));
    if (pin.length >= 6) return;
    setPin((p) => p + key);
  }

  async function submit() {
    if (pin.length < 4) {
      setError("PIN must be at least 4 digits.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/pin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "PIN not recognized.");
        setPin("");
        setSubmitting(false);
        return;
      }
      router.push("/shift/new");
    } catch {
      setError("Could not reach the server. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full">
      <div
        className="mb-5 flex h-14 items-center justify-center gap-3 rounded-lg border border-white/15 bg-white/5 text-2xl tracking-[0.5em]"
        aria-live="polite"
      >
        {pin.length === 0 ? (
          <span className="text-white/30 tracking-normal text-base">PIN</span>
        ) : (
          Array.from(pin).map((_, i) => <span key={i}>•</span>)
        )}
      </div>

      {error ? (
        <p className="mb-3 text-center text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-3 gap-3">
        {KEYS.map((key) => (
          <button
            key={key}
            onClick={() => press(key)}
            className="h-16 rounded-lg bg-white/5 text-2xl font-medium text-white transition hover:bg-white/10 active:scale-95"
            type="button"
            disabled={submitting}
          >
            {key === "back" ? "←" : key === "clear" ? "C" : key}
          </button>
        ))}
      </div>

      <button
        onClick={submit}
        disabled={submitting || pin.length < 4}
        className="btn mt-5 w-full text-lg disabled:opacity-50"
        type="button"
      >
        {submitting ? "Checking…" : "Continue"}
      </button>
    </div>
  );
}
