"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { DATE_RE } from "@/lib/dates";
import { scale, num } from "@/lib/nutrition";
import type { Food, FoodDraft, Meal, NutrientKey, Nutrients } from "@/lib/types";
import { ACTIVITIES, MEALS, NUTRIENT_KEYS } from "@/lib/types";

type Result = { ok: true } | { ok: false, error: string };

function checkLogArgs(meal: Meal, date: string, servings: number): string | null {
  if (!MEALS.includes(meal)) return "Pick a meal.";
  if (!DATE_RE.test(date)) return "Invalid date.";
  if (!(servings > 0 && servings <= 100)) return "Servings must be more than 0.";
  return null;
}

function cleanNutrients(d: Partial<Record<NutrientKey, unknown>>) {
  const out = {} as Record<NutrientKey, number | null>;
  for (const k of NUTRIENT_KEYS) {
    const v = d[k];
    const n = v === null || v === undefined || v === "" ? null : Number(v);
    out[k] = n !== null && Number.isFinite(n) && n >= 0 ? n : null;
  }
  for (const k of ["kcal", "protein_g", "carbs_g", "fat_g"] as const) out[k] = out[k] ?? 0;
  return out;
}

function snapshot(food: Pick<Food, "name" | "brand" | "serving_label"> & Record<NutrientKey, number | null>, servings: number) {
  const per = Object.fromEntries(
    NUTRIENT_KEYS.map((k) => [k, food[k] === null || food[k] === undefined ? null : Number(food[k])]),
  ) as unknown as Nutrients;
  return {
    name: food.brand ? `${food.name} (${food.brand})` : food.name,
    serving_label: food.serving_label,
    ...scale(per, servings),
  };
}

/** Digits only; null when empty; false when it can't be a barcode. */
function cleanBarcode(v: string | null | undefined): string | null | false {
  const code = (v ?? "").replace(/\D/g, "");
  if (!code) return null;
  return /^\d{6,14}$/.test(code) ? code : false;
}

/** Turn the form's draft into a foods row, or explain what's missing. */
function foodRow(userId: string, draft: FoodDraft, share: boolean) {
  const name = draft.name.trim();
  if (!name) return { ok: false as const, error: "Give the food a name." };
  const barcode = cleanBarcode(draft.barcode);
  if (barcode === false) return { ok: false as const, error: "A barcode has 6 to 14 digits." };
  return {
    ok: true as const,
    row: {
      created_by: userId,
      name: name.slice(0, 200),
      brand: draft.brand.trim() || null,
      local_name: (draft.local_name ?? "").trim().slice(0, 200) || null,
      serving_label: draft.serving_label.trim() || "1 serving",
      barcode,
      source: draft.source,
      label_photo_path:
        draft.label_photo_path && draft.label_photo_path.startsWith(userId + "/") ? draft.label_photo_path : null,
      photo_path: draft.photo_path && draft.photo_path.startsWith(userId + "/") ? draft.photo_path : null,
      status: share ? ("pending" as const) : ("private" as const),
      ...cleanNutrients(draft),
    },
  };
}

/** Save a new food without logging it: to your own foods, or sent for review if shared. */
export async function createFood(input: { draft: FoodDraft; share: boolean }): Promise<Result> {
  const { supabase, user } = await requireUser();
  const r = foodRow(user.id, input.draft, input.share);
  if (!r.ok) return r;
  const { error } = await supabase.from("foods").insert(r.row);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Save a new food (private, or sent for review if shared) and log it. */
export async function createFoodAndLog(input: {
  draft: FoodDraft;
  share: boolean;
  servings: number;
  meal: Meal;
  date: string;
}): Promise<Result> {
  const { supabase, user } = await requireUser();
  const { draft, share, servings, meal, date } = input;
  const bad = checkLogArgs(meal, date, servings);
  if (bad) return { ok: false, error: bad };

  const r = foodRow(user.id, draft, share);
  if (!r.ok) return r;
  const row = r.row;

  const { data: food, error } = await supabase.from("foods").insert(row).select().single();
  if (error || !food) return { ok: false, error: error?.message ?? "Could not save the food." };

  const { error: logError } = await supabase.from("food_logs").insert({
    user_id: user.id,
    food_id: food.id,
    logged_on: date,
    meal,
    servings,
    ...snapshot(food as Food, servings),
  });
  if (logError) return { ok: false, error: logError.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Log a food that already exists (yours, or from the library). */
export async function logFood(input: {
  foodId: string;
  servings: number;
  meal: Meal;
  date: string;
}): Promise<Result> {
  const { supabase, user } = await requireUser();
  const bad = checkLogArgs(input.meal, input.date, input.servings);
  if (bad) return { ok: false, error: bad };

  const { data: food } = await supabase.from("foods").select("*").eq("id", input.foodId).single();
  if (!food) return { ok: false, error: "That food is no longer available." };

  const { error } = await supabase.from("food_logs").insert({
    user_id: user.id,
    food_id: food.id,
    logged_on: input.date,
    meal: input.meal,
    servings: input.servings,
    ...snapshot(food as Food, input.servings),
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Log the same thing again from a previous log entry (the "Recent" list). */
export async function relog(input: { logId: string; meal: Meal; date: string }): Promise<Result> {
  const { supabase, user } = await requireUser();
  const bad = checkLogArgs(input.meal, input.date, 1);
  if (bad) return { ok: false, error: bad };
  const { data: prev } = await supabase.from("food_logs").select("*").eq("id", input.logId).single();
  if (!prev) return { ok: false, error: "Entry not found." };
  const { id: _id, created_at: _c, ...rest } = prev;
  const { error } = await supabase
    .from("food_logs")
    .insert({ ...rest, user_id: user.id, meal: input.meal, logged_on: input.date });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteLog(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (id) await supabase.from("food_logs").delete().eq("id", id);
  revalidatePath("/", "layout");
}

/** The optional "About you" fields. Anything missing or out of range is saved as empty. */
function aboutYou(formData: FormData) {
  const inRange = (v: number | null, lo: number, hi: number) => (v !== null && v >= lo && v <= hi ? v : null);
  const sex = String(formData.get("sex") ?? "");
  const activity = String(formData.get("activity") ?? "");
  const age = inRange(num(formData.get("age")), 10, 120);
  return {
    sex: sex === "female" || sex === "male" ? sex : null,
    birth_year: age === null ? null : new Date().getFullYear() - Math.round(age),
    height_cm: inRange(num(formData.get("height_cm")), 50, 300),
    weight_kg: inRange(num(formData.get("weight_kg")), 20, 500),
    activity: ACTIVITIES.some((a) => a.key === activity) ? activity : null,
  };
}

export async function saveGoals(_prev: unknown, formData: FormData) {
  const { supabase, user } = await requireUser();
  const mode = String(formData.get("goal_mode") ?? "maintain");
  const n = (k: string) => Math.round(num(formData.get(k)) ?? 0);
  const { error } = await supabase
    .from("profiles")
    .update({
      goal_mode: ["lose", "maintain", "gain"].includes(mode) ? mode : "maintain",
      kcal_goal: n("kcal_goal"),
      protein_goal: n("protein_goal"),
      carbs_goal: n("carbs_goal"),
      fat_goal: n("fat_goal"),
      water_goal_ml: n("water_goal_ml"),
      ...aboutYou(formData),
    })
    .eq("id", user.id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved." };
}

export async function inviteFriend(_prev: unknown, formData: FormData) {
  const { supabase, user } = await requireUser();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "That doesn't look like an email address." };
  }
  const { error } = await supabase.from("invites").insert({ email, invited_by: user.id });
  if (error && !/duplicate/i.test(error.message)) return { ok: false, message: error.message };
  revalidatePath("/profile");
  return {
    ok: true,
    message: `${email} can now sign in. Send them the link to this app.`,
  };
}

export async function reviewFood(input: {
  foodId: string;
  decision: "approve" | "reject";
  fixes?: Partial<FoodDraft> | null;
  note?: string | null;
}): Promise<Result> {
  const { supabase } = await requireUser();
  let fixes: Record<string, unknown> | null = null;
  if (input.fixes) {
    fixes = {
      ...cleanNutrients(input.fixes),
      name: input.fixes.name?.trim() ?? "",
      brand: input.fixes.brand?.trim() ?? "",
      serving_label: input.fixes.serving_label?.trim() ?? "",
    };
  }
  const { error } = await supabase.rpc("review_food", {
    food_id: input.foodId,
    decision: input.decision,
    fixes,
    note: input.note ?? null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Edit a food in the library. You can edit foods you added; the app owner can edit any food.
 * A friend's change to a shared food goes back for review.
 */
export async function updateFood(input: { id: string; draft: FoodDraft; share: boolean }): Promise<Result> {
  const { supabase } = await requireUser();
  const d = input.draft;
  if (!d.name.trim()) return { ok: false, error: "Give the food a name." };
  const barcode = cleanBarcode(d.barcode);
  if (barcode === false) return { ok: false, error: "A barcode has 6 to 14 digits." };
  const fields = {
    name: d.name.trim().slice(0, 200),
    brand: d.brand.trim(),
    local_name: (d.local_name ?? "").trim(),
    serving_label: d.serving_label.trim() || "1 serving",
    barcode: barcode ?? "",
    photo_path: d.photo_path ?? "",
    ...cleanNutrients(d),
  };
  const { error } = await supabase.rpc("update_food", { food_id: input.id, fields, share: input.share });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Withdraw your own food from the library queue or delete a private one. */
export async function deleteFood(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (id) await supabase.from("foods").delete().eq("id", id);
  revalidatePath("/", "layout");
}

export async function updateName(_prev: unknown, formData: FormData) {
  const { supabase, user } = await requireUser();
  const name = String(formData.get("display_name") ?? "").trim().slice(0, 60);
  if (!name) return { ok: false, message: "Your name can't be empty." };
  const { error } = await supabase.from("profiles").update({ display_name: name }).eq("id", user.id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/", "layout");
  return { ok: true, message: "Name saved." };
}

export async function addWater(input: { ml: number; date: string }): Promise<Result> {
  const { supabase, user } = await requireUser();
  if (!DATE_RE.test(input.date)) return { ok: false, error: "Invalid date." };
  const ml = Math.round(input.ml);
  if (!(ml > 0 && ml <= 5000)) return { ok: false, error: "Enter between 1 and 5000 ml." };
  const { error } = await supabase.from("water_logs").insert({ user_id: user.id, logged_on: input.date, ml });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}

/** Removes the most recent water entry for that day. */
export async function undoWater(input: { date: string }): Promise<Result> {
  const { supabase } = await requireUser();
  if (!DATE_RE.test(input.date)) return { ok: false, error: "Invalid date." };
  const { data } = await supabase
    .from("water_logs")
    .select("id")
    .eq("logged_on", input.date)
    .order("created_at", { ascending: false })
    .limit(1);
  if (data?.[0]) await supabase.from("water_logs").delete().eq("id", data[0].id);
  revalidatePath("/");
  return { ok: true };
}
