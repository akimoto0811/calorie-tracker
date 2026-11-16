export type Meal = "breakfast" | "lunch" | "dinner" | "snacks" | "drinks";
export const MEALS: Meal[] = ["breakfast", "lunch", "dinner", "snacks", "drinks"];
export const MEAL_LABEL: Record<Meal, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snacks",
  drinks: "Drinks",
};

export type FoodSource = "manual" | "label" | "barcode";
export type FoodStatus = "private" | "pending" | "approved" | "rejected";

/** Nutrition values for one serving. Core values are required; the rest are optional. */
export interface Nutrients {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  sat_fat_g: number | null;
  sugar_g: number | null;
  fiber_g: number | null;
  salt_g: number | null;
}

export const NUTRIENT_KEYS = [
  "kcal",
  "protein_g",
  "carbs_g",
  "fat_g",
  "sat_fat_g",
  "sugar_g",
  "fiber_g",
  "salt_g",
] as const;
export type NutrientKey = (typeof NUTRIENT_KEYS)[number];

export const NUTRIENT_LABEL: Record<NutrientKey, string> = {
  kcal: "Calories (kcal)",
  protein_g: "Protein (g)",
  carbs_g: "Carbs (g)",
  fat_g: "Fat (g)",
  sat_fat_g: "Saturated fat (g)",
  sugar_g: "Sugar (g)",
  fiber_g: "Fibre (g)",
  salt_g: "Salt (g)",
};

export const CORE_NUTRIENTS: NutrientKey[] = ["kcal", "protein_g", "carbs_g", "fat_g"];
export const EXTRA_NUTRIENTS: NutrientKey[] = ["sat_fat_g", "sugar_g", "fiber_g", "salt_g"];

export interface Food extends Nutrients {
  id: string;
  created_by: string;
  name: string;
  brand: string | null;
  serving_label: string;
  barcode: string | null;
  source: FoodSource;
  label_photo_path: string | null;
  status: FoodStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
}

export interface LogEntry extends Nutrients {
  id: string;
  user_id: string;
  food_id: string | null;
  logged_on: string;
  meal: Meal;
  servings: number;
  name: string;
  serving_label: string;
  created_at: string;
}

export interface Profile {
  id: string;
  display_name: string;
  goal_mode: "lose" | "maintain" | "gain";
  kcal_goal: number;
  protein_goal: number;
  carbs_goal: number;
  fat_goal: number;
  water_goal_ml: number;
}

/** What the food form edits, before it becomes a Food row. */
export interface FoodDraft extends Nutrients {
  name: string;
  brand: string;
  serving_label: string;
  barcode: string | null;
  source: FoodSource;
  label_photo_path: string | null;
}

export function emptyDraft(source: FoodSource): FoodDraft {
  return {
    name: "",
    brand: "",
    serving_label: "1 serving",
    barcode: null,
    source,
    label_photo_path: null,
    kcal: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    sat_fat_g: null,
    sugar_g: null,
    fiber_g: null,
    salt_g: null,
  };
}
