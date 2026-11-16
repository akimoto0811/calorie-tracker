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

/**
 * Every nutrient we track, in the order a Nutrition Facts label lists them.
 * Calories, fat, carbs and protein are required; the rest are optional (null = not on the label).
 */
export const NUTRIENT_KEYS = [
  "kcal",
  "fat_g",
  "sat_fat_g",
  "trans_fat_g",
  "cholesterol_mg",
  "sodium_mg",
  "carbs_g",
  "fiber_g",
  "sugar_g",
  "added_sugar_g",
  "protein_g",
  "vitamin_d_mcg",
  "calcium_mg",
  "iron_mg",
  "potassium_mg",
] as const;
export type NutrientKey = (typeof NUTRIENT_KEYS)[number];

export const CORE_NUTRIENTS = ["kcal", "protein_g", "carbs_g", "fat_g"] as const satisfies readonly NutrientKey[];
type CoreKey = (typeof CORE_NUTRIENTS)[number];
export const EXTRA_NUTRIENTS = NUTRIENT_KEYS.filter(
  (k) => !(CORE_NUTRIENTS as readonly string[]).includes(k),
) as Exclude<NutrientKey, CoreKey>[];

/** Nutrition values for one serving. */
export type Nutrients = { [K in CoreKey]: number } & { [K in Exclude<NutrientKey, CoreKey>]: number | null };

/** Short name, as printed on a label. */
export const NUTRIENT_NAME: Record<NutrientKey, string> = {
  kcal: "Calories",
  fat_g: "Total fat",
  sat_fat_g: "Saturated fat",
  trans_fat_g: "Trans fat",
  cholesterol_mg: "Cholesterol",
  sodium_mg: "Sodium",
  carbs_g: "Total carbs",
  fiber_g: "Fibre",
  sugar_g: "Total sugars",
  added_sugar_g: "Added sugars",
  protein_g: "Protein",
  vitamin_d_mcg: "Vitamin D",
  calcium_mg: "Calcium",
  iron_mg: "Iron",
  potassium_mg: "Potassium",
};

export const NUTRIENT_UNIT: Record<NutrientKey, string> = {
  kcal: "kcal",
  fat_g: "g",
  sat_fat_g: "g",
  trans_fat_g: "g",
  cholesterol_mg: "mg",
  sodium_mg: "mg",
  carbs_g: "g",
  fiber_g: "g",
  sugar_g: "g",
  added_sugar_g: "g",
  protein_g: "g",
  vitamin_d_mcg: "mcg",
  calcium_mg: "mg",
  iron_mg: "mg",
  potassium_mg: "mg",
};

/** e.g. "Sodium (mg)". */
export const NUTRIENT_LABEL = Object.fromEntries(
  NUTRIENT_KEYS.map((k) => [k, `${NUTRIENT_NAME[k]} (${NUTRIENT_UNIT[k]})`]),
) as Record<NutrientKey, string>;

/** Indented under the line above, like on a label. */
export const SUB_NUTRIENTS: NutrientKey[] = ["sat_fat_g", "trans_fat_g", "fiber_g", "sugar_g", "added_sugar_g"];
/** Vitamins and minerals, shown below a divider. */
export const MICRO_NUTRIENTS: NutrientKey[] = ["vitamin_d_mcg", "calcium_mg", "iron_mg", "potassium_mg"];

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
    ...(Object.fromEntries(EXTRA_NUTRIENTS.map((k) => [k, null])) as Record<(typeof EXTRA_NUTRIENTS)[number], null>),
  };
}
