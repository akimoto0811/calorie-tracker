"use client";

import { useState } from "react";

export const UNITS = ["g", "ml", "piece", "slice", "cup", "tbsp", "tsp", "bar", "bottle", "can", "pack"];

/** Splits "250 ml" into { amount: "250", unit: "ml" }. Anything else keeps its text as the unit. */
export function parseServing(label: string): { amount: string; unit: string } {
  const m = label.trim().match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (!m) return { amount: "1", unit: label.trim() || "g" };
  return { amount: m[1].replace(",", "."), unit: m[2].trim() || "g" };
}

/** "One serving is: [250] [ml]". Calls onChange with the combined label, e.g. "250 ml". */
export function ServingInput({
  value,
  onChange,
  flagged,
}: {
  value: string;
  onChange: (label: string) => void;
  flagged?: boolean;
}) {
  const initial = parseServing(value);
  const [amount, setAmount] = useState(initial.amount);
  const [unit, setUnit] = useState(initial.unit);
  const units = UNITS.includes(unit) ? UNITS : [unit, ...UNITS];

  const update = (a: string, u: string) => {
    setAmount(a);
    setUnit(u);
    onChange(`${a.trim() || "1"} ${u}`.trim());
  };

  const cls = flagged ? "input uncertain" : "input";
  return (
    <div className="field">
      <label htmlFor="f-serving-amount" className="label">
        One serving is
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          id="f-serving-amount"
          className={cls}
          inputMode="decimal"
          value={amount}
          onChange={(e) => update(e.target.value, unit)}
          style={{ flex: 1, minWidth: 0 }}
          aria-describedby="serving-hint"
        />
        <label htmlFor="f-serving-unit" className="sr-only">
          Unit
        </label>
        <select
          id="f-serving-unit"
          className={cls}
          value={unit}
          onChange={(e) => update(amount, e.target.value)}
          style={{ flex: 1, minWidth: 0, paddingRight: 8 }}
        >
          {units.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>
      <span id="serving-hint" className="muted" style={{ fontSize: 12 }}>
        The amount the numbers below are for, e.g. 250 ml or 30 g.
      </span>
    </div>
  );
}
