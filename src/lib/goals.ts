import { ACTIVITIES, type Activity } from "./types";

export interface AboutYou {
  sex: "female" | "male" | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity: Activity | null;
}

/** The lowest daily calories health guidelines recommend without a doctor's supervision. */
export function calorieFloor(sex: AboutYou["sex"]): number {
  return sex === "male" ? 1500 : 1200;
}

/**
 * Suggested daily calories.
 * With age, height and weight: Mifflin-St Jeor × activity level.
 * Without them: the middle of the US Dietary Guidelines adult range
 * (women 1,600–2,400 → 2,000; men 2,000–3,000 → 2,500).
 * Then −500 to lose or +300 to gain, never below the safe minimum.
 */
export function suggestCalories(a: AboutYou, mode: "lose" | "maintain" | "gain"): { kcal: number; personal: boolean } {
  const personal = !!(a.age && a.height_cm && a.weight_kg);
  const factor = ACTIVITIES.find((x) => x.key === a.activity)?.factor ?? 1.375;
  const female = a.sex !== "male";
  let maintain: number;
  if (personal) {
    const base = 10 * a.weight_kg! + 6.25 * a.height_cm! - 5 * a.age!;
    // Without a sex, use the average of the two formulas.
    const adj = a.sex === "male" ? 5 : a.sex === "female" ? -161 : -78;
    maintain = (base + adj) * factor;
  } else {
    maintain = a.sex === "male" ? 2500 : a.sex === "female" ? 2000 : 2250;
  }
  const delta = mode === "lose" ? -500 : mode === "gain" ? 300 : 0;
  const kcal = Math.max(calorieFloor(female ? "female" : "male"), Math.round((maintain + delta) / 10) * 10);
  return { kcal, personal };
}

/** A short warning when the goal is far from the suggestion, or below the safe minimum. */
export function goalWarning(goal: number, suggestion: number, mode: "lose" | "maintain" | "gain", sex: AboutYou["sex"]): string | null {
  if (!goal) return null;
  const f = (n: number) => Math.round(n).toLocaleString("en-GB");
  const floor = calorieFloor(sex);
  if (goal < floor) {
    return `Below ${f(floor)} kcal, the lowest health guidelines recommend${sex ? ` for ${sex === "male" ? "men" : "women"}` : ""} without a doctor.`;
  }
  const over = goal - suggestion;
  if (over > 250) {
    return `${f(over)} kcal over your suggestion${mode === "lose" ? ", so you may not lose weight." : mode === "maintain" ? ", so you may gain weight." : "."}`;
  }
  if (-over > 250 && mode !== "lose") {
    return `${f(-over)} kcal under your suggestion${mode === "gain" ? ", so you may not gain weight." : ", so you may lose weight."}`;
  }
  return null;
}
