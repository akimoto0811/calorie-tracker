"use client";

import { MEALS, MEAL_LABEL, type Meal } from "@/lib/types";

export function MealChips({ value, onChange }: { value: Meal; onChange: (m: Meal) => void }) {
  return (
    <div className="chips" role="group" aria-label="Meal">
      {MEALS.map((m) => (
        <button
          key={m}
          type="button"
          className={m === value ? "chip on" : "chip"}
          aria-pressed={m === value}
          onClick={() => onChange(m)}
        >
          {MEAL_LABEL[m]}
        </button>
      ))}
    </div>
  );
}

const STEP = 0.5;

export function ServingsStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const clamp = (n: number) => Math.max(0.25, Math.min(100, Math.round(n * 100) / 100));
  return (
    <div className="stepper">
      <button type="button" aria-label="Less" onClick={() => onChange(clamp(value <= STEP ? 0.25 : value - STEP))}>
        −
      </button>
      <input
        aria-label="Servings"
        inputMode="decimal"
        value={String(value)}
        onChange={(e) => {
          const n = Number(e.target.value.replace(",", "."));
          if (Number.isFinite(n) && n > 0) onChange(clamp(n));
        }}
      />
      <button type="button" aria-label="More" onClick={() => onChange(clamp(value < STEP ? STEP : value + STEP))}>
        +
      </button>
    </div>
  );
}
