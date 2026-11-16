"use client";

import { useActionState, useState } from "react";
import { saveGoals } from "@/app/actions";
import { fmt, macroKcal } from "@/lib/nutrition";
import type { Profile } from "@/lib/types";

const MODES = [
  { key: "lose", label: "Lose" },
  { key: "maintain", label: "Maintain" },
  { key: "gain", label: "Gain" },
] as const;

const ROWS = [
  { key: "kcal_goal", label: "Calories", unit: "kcal", color: null },
  { key: "protein_goal", label: "Protein", unit: "g", color: "var(--protein)" },
  { key: "carbs_goal", label: "Carbs", unit: "g", color: "var(--carbs)" },
  { key: "fat_goal", label: "Fat", unit: "g", color: "var(--fat)" },
] as const;

export function GoalsForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState(saveGoals, null);
  const [mode, setMode] = useState(profile.goal_mode);
  const [vals, setVals] = useState({
    kcal_goal: String(profile.kcal_goal),
    protein_goal: String(profile.protein_goal),
    carbs_goal: String(profile.carbs_goal),
    fat_goal: String(profile.fat_goal),
  });
  const n = (s: string) => Number(s.replace(",", ".")) || 0;
  const fromMacros = macroKcal(n(vals.protein_goal), n(vals.carbs_goal), n(vals.fat_goal));
  const diff = fromMacros - n(vals.kcal_goal);

  return (
    <form action={action} className="card">
      <h2 style={{ fontFamily: "var(--font)", fontSize: 16 }}>Daily goals</h2>

      <div className="field">
        <label htmlFor="display_name" className="label">
          Name friends see
        </label>
        <input id="display_name" name="display_name" className="input" defaultValue={profile.display_name} maxLength={60} />
      </div>

      <input type="hidden" name="goal_mode" value={mode} />
      <div className="seg" role="radiogroup" aria-label="Goal">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            role="radio"
            aria-checked={mode === m.key}
            className={mode === m.key ? "on" : undefined}
            onClick={() => setMode(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {ROWS.map((r) => (
        <div key={r.key} className="between" style={{ alignItems: "center" }}>
          <label htmlFor={r.key} style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
            {r.color && <span className="swatch" style={{ background: r.color }} />}
            {r.label}
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              id={r.key}
              name={r.key}
              inputMode="numeric"
              value={vals[r.key]}
              onChange={(e) => setVals({ ...vals, [r.key]: e.target.value })}
              className="input"
              style={{ width: 96, height: 44, textAlign: "right", fontWeight: 700 }}
            />
            <span className="muted" style={{ fontSize: 14, width: 32 }}>
              {r.unit}
            </span>
          </div>
        </div>
      ))}

      <p className="muted small">
        Macros add up to {fmt(fromMacros)} kcal
        {Math.abs(diff) <= 50
          ? ", close to your calorie goal."
          : diff > 0
            ? `, ${fmt(diff)} more than your calorie goal.`
            : `, ${fmt(-diff)} less than your calorie goal.`}
      </p>

      <button className="btn btn-primary" disabled={pending}>
        {pending ? <span className="spinner" /> : "Save goals"}
      </button>
      {state?.message && (
        <div className={state.ok ? "notice ok" : "notice error"} role="status">
          {state.message}
        </div>
      )}
    </form>
  );
}
