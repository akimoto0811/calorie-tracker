"use client";

import { useEffect, useState } from "react";
import { fmt } from "@/lib/nutrition";
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

/** "250 ml" → 250 ml; "1 bar (40 g)" → 40 g. Null when the serving isn't a weight or volume. */
export function servingBase(label: string): { amount: number; unit: string } | null {
  const t = label.trim();
  const m = t.match(/^(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|oz|fl oz|cl|dl)$/i) ?? t.match(/\((\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|oz|fl oz|cl|dl)\)\s*$/i);
  if (!m) return null;
  const amount = Number(m[1].replace(",", "."));
  return amount > 0 ? { amount, unit: m[2].toLowerCase() } : null;
}

const tidy = (n: number) => String(Math.round(n * 100) / 100);

/**
 * "How much did you have?" Type the amount you ate, either in the serving's own unit
 * (e.g. 400 ml when one serving is 250 ml) or as a number of servings (e.g. 1.5).
 */
export function AmountEaten({
  servingLabel,
  kcal,
  servings,
  onChange,
}: {
  servingLabel: string;
  kcal: number;
  servings: number;
  onChange: (servings: number) => void;
}) {
  const base = servingBase(servingLabel);
  const [unit, setUnit] = useState<"servings" | "base">(base ? "base" : "servings");
  const [text, setText] = useState(() => (base ? tidy(base.amount * servings) : tidy(servings)));
  const useBase = unit === "base" && base !== null;

  // Keep the typed amount meaningful when the serving size itself changes.
  const baseKey = base ? `${base.amount} ${base.unit}` : "";
  useEffect(() => {
    if (!base && unit === "base") {
      setUnit("servings");
      setText(tidy(servings));
    } else if (useBase) {
      update(text);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseKey]);

  function update(t: string) {
    setText(t);
    const n = Number(t.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return;
    const s = useBase ? n / base!.amount : n;
    onChange(Math.min(100, Math.round(s * 1000) / 1000));
  }

  function switchUnit(next: "servings" | "base") {
    setUnit(next);
    setText(next === "base" && base ? tidy(base.amount * servings) : tidy(servings));
  }

  const valid = Number(text.replace(",", ".")) > 0;
  return (
    <div className="card tight" style={{ gap: 10 }}>
      <label htmlFor="amount-eaten" style={{ fontWeight: 700 }}>
        How much did you have?
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          id="amount-eaten"
          className={valid ? "input" : "input uncertain"}
          inputMode="decimal"
          value={text}
          onChange={(e) => update(e.target.value)}
          onFocus={(e) => e.target.select()}
          style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 18 }}
        />
        <label htmlFor="amount-unit" className="sr-only">
          Unit
        </label>
        <select
          id="amount-unit"
          className="input"
          value={useBase ? "base" : "servings"}
          onChange={(e) => switchUnit(e.target.value as "servings" | "base")}
          style={{ width: 132, flexShrink: 0 }}
        >
          {base && <option value="base">{base.unit}</option>}
          <option value="servings">{servings === 1 ? "serving" : "servings"}</option>
        </select>
      </div>
      <div className="muted small">
        {valid
          ? `${
              useBase
                ? `= ${fmt(servings, 2)} ${servings === 1 ? "serving" : "servings"}`
                : base
                  ? `= ${fmt(base.amount * servings, 1)} ${base.unit}`
                  : `× ${servingLabel}`
            } · ${fmt(kcal * servings)} kcal`
          : "Type how much you had, e.g. 1.5"}
      </div>
    </div>
  );
}
