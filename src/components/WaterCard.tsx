"use client";

import { useOptimistic, useState, useTransition } from "react";
import { addWater, undoWater } from "@/app/actions";
import { fmt } from "@/lib/nutrition";

const AMOUNTS = [250, 500];

export function WaterCard({ total, goal, date, entries }: { total: number; goal: number; date: string; entries: number }) {
  const [shown, setShown] = useOptimistic(total);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const pct = goal > 0 ? Math.min((shown / goal) * 100, 100) : 0;
  const glasses = Math.max(0, Math.round(shown / 250));

  const run = (delta: number, fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null);
      setShown(Math.max(0, shown + delta));
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Couldn't save.");
    });

  return (
    <section className="card">
      <div className="between">
        <h2>Water</h2>
        <span className="muted" style={{ fontSize: 14 }}>
          <b style={{ color: "var(--text)" }}>{fmt(shown / 1000, 2)}</b> / {fmt(goal / 1000, 2)} L
        </span>
      </div>
      <div
        className="bar-track"
        style={{ background: "var(--water-soft)", height: 12, borderRadius: 6 }}
        role="progressbar"
        aria-label="Water"
        aria-valuenow={shown}
        aria-valuemin={0}
        aria-valuemax={goal}
      >
        <div className="bar-fill" style={{ width: `${pct}%`, height: 12, background: "var(--water)" }} />
      </div>
      <div className="muted small">
        {shown >= goal && goal > 0 ? "Goal reached. Nice!" : `About ${glasses} glass${glasses === 1 ? "" : "es"} so far`}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {AMOUNTS.map((ml) => (
          <button
            key={ml}
            type="button"
            className="btn btn-secondary"
            style={{ height: 44, flex: 1, color: "var(--water-text)" }}
            onClick={() => run(ml, () => addWater({ ml, date }))}
          >
            +{ml} ml
          </button>
        ))}
        <button
          type="button"
          className="btn btn-secondary"
          style={{ height: 44, width: "auto", fontSize: 14 }}
          disabled={pending || entries === 0}
          aria-label="Undo last water"
          onClick={() => run(0, () => undoWater({ date }))}
        >
          Undo
        </button>
      </div>
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
    </section>
  );
}
