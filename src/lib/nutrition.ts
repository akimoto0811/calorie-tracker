import type { Meal, NutrientKey, Nutrients } from "./types";
import { NUTRIENT_KEYS } from "./types";

export function round(n: number, digits = 1): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

export function fmt(n: number | null | undefined, digits = 0): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "–";
  return round(n, digits).toLocaleString("en-GB");
}

/** Multiply per-serving nutrients by a number of servings. */
export function scale(n: Nutrients, servings: number): Nutrients {
  const out = {} as Nutrients;
  for (const k of NUTRIENT_KEYS) {
    const v = n[k];
    (out as unknown as Record<NutrientKey, number | null>)[k] =
      v === null || v === undefined ? null : round(Number(v) * servings, 2);
  }
  return out;
}

export interface Totals {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export function sum(rows: Partial<Totals>[]): Totals {
  return rows.reduce<Totals>(
    (t, r) => ({
      kcal: t.kcal + Number(r.kcal ?? 0),
      protein_g: t.protein_g + Number(r.protein_g ?? 0),
      carbs_g: t.carbs_g + Number(r.carbs_g ?? 0),
      fat_g: t.fat_g + Number(r.fat_g ?? 0),
    }),
    { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
}

/** Calories from macros (4/4/9 kcal per gram). */
export function macroKcal(protein: number, carbs: number, fat: number): number {
  return protein * 4 + carbs * 4 + fat * 9;
}

/** Breakfast before 10:30, lunch before 15:00, snacks before 17:00, then dinner. */
export function defaultMeal(date = new Date()): Meal {
  const mins = date.getHours() * 60 + date.getMinutes();
  if (mins < 630) return "breakfast";
  if (mins < 900) return "lunch";
  if (mins < 1020) return "snacks";
  return "dinner";
}

/** Parse a form number; empty means null. */
export function num(v: FormDataEntryValue | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim().replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
