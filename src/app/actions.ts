"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { DATE_RE } from "@/lib/dates";
import { scale, num } from "@/lib/nutrition";
import type { Food, FoodDraft, Meal, NutrientKey } from "@/lib/types";
import { MEALS, NUTRIENT_KEYS } from "@/lib/types";

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
  const scaled = scale(
    {
      kcal: Number(food.kcal),
      protein_g: Number(food.protein_g),
      carbs_g: Number(food.carbs_g),
      fat_g: Number(food.fat_g),
      sat_fat_g: food.sat_fat_g,
      sugar_g: food.sugar_g,
      fiber_g: food.fiber_g,
      salt_g: food.salt_g,
    },
    servings,
  );
  return {
    name: food.brand ? `${food.name} (${food.brand})` : food.name,
    serving_label: food.serving_label,
    ...scaled,
  };
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

  const name = draft.name.trim();
  if (!name) return { ok: false, error: "Give the food a name." };

  const nutrients = cleanNutrients(draft);
  const row = {
    created_by: user.id,
    name: name.slice(0, 200),
    brand: draft.brand.trim() || null,
    serving_label: draft.serving_label.trim() || "1 serving",
    barcode: draft.barcode?.trim() || null,
    source: draft.source,
    label_photo_path:
      draft.label_photo_path && draft.label_photo_path.startsWith(user.id + "/")
        ? draft.label_photo_path
        : null,
    status: share ? ("pending" as const) : ("private" as const),
    ...nutrients,
  };

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
