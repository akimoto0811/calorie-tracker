"use client";

import { useState, useTransition } from "react";
import { relog } from "@/app/actions";
import type { Meal } from "@/lib/types";
import { Check, Plus } from "./icons";

/** One-tap "log this again" button for the Recent list. */
export function QuickAdd({ logId, meal, date, label }: { logId: string; meal: Meal; date: string; label: string }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <button
      type="button"
      className="round-add"
      aria-label={done ? `${label} added` : `Add ${label}`}
      title={error ?? undefined}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await relog({ logId, meal, date });
          if (r.ok) {
            setDone(true);
            setTimeout(() => setDone(false), 2000);
          } else setError(r.error);
        })
      }
    >
      {pending ? <span className="spinner" /> : done ? <Check size={18} /> : <Plus size={18} />}
    </button>
  );
}
