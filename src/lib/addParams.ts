import "server-only";
import { DATE_RE, localNow, today } from "./dates";
import { defaultMeal } from "./nutrition";
import { MEALS, type Meal } from "./types";

export type AddSearchParams = Promise<{ meal?: string; date?: string; q?: string }>;

/** Reads ?meal= and ?date= for the add-food screens, with sensible defaults. */
export async function readAddParams(searchParams: AddSearchParams) {
  const sp = await searchParams;
  const todayStr = await today();
  const meal: Meal = MEALS.includes(sp.meal as Meal) ? (sp.meal as Meal) : defaultMeal(await localNow());
  const date = sp.date && DATE_RE.test(sp.date) && sp.date <= todayStr ? sp.date : todayStr;
  const qs = new URLSearchParams({ meal });
  if (date !== todayStr) qs.set("date", date);
  return { meal, date, today: todayStr, q: (sp.q ?? "").trim(), qs: qs.toString() };
}
