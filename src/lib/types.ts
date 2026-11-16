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
 * - core: always on the form and required (0 when empty). Daily totals use these.
 * - fixed: always on the form (the standard US label lines), but can be left empty.
 * - extra: added from the "Add more nutrients" sheet when a label shows it.
 * `off` is the Open Food Facts nutriment name (OFF stores everything in grams).
 * `dv` is the US daily value, used only to convert "% DV" when reading label photos.
 */
export const NUTRIENTS = [
  { key: "kcal", name: "Calories", unit: "kcal", kind: "core", group: "macros" },
  { key: "fat_g", name: "Total fat", unit: "g", kind: "core", group: "macros", off: "fat" },
  { key: "sat_fat_g", name: "Saturated fat", unit: "g", kind: "fixed", sub: true, group: "macros", off: "saturated-fat" },
  { key: "trans_fat_g", name: "Trans fat", unit: "g", kind: "extra", sub: true, group: "macros", off: "trans-fat" },
  { key: "mono_fat_g", name: "Monounsaturated fat", unit: "g", kind: "extra", sub: true, group: "macros", off: "monounsaturated-fat" },
  { key: "poly_fat_g", name: "Polyunsaturated fat", unit: "g", kind: "extra", sub: true, group: "macros", off: "polyunsaturated-fat" },
  { key: "omega3_g", name: "Omega-3", unit: "g", kind: "extra", sub: true, group: "macros", off: "omega-3-fat" },
  { key: "omega6_g", name: "Omega-6", unit: "g", kind: "extra", sub: true, group: "macros", off: "omega-6-fat" },
  { key: "cholesterol_mg", name: "Cholesterol", unit: "mg", kind: "fixed", group: "macros", off: "cholesterol", dv: 300 },
  { key: "sodium_mg", name: "Sodium", unit: "mg", kind: "fixed", group: "salts", off: "sodium", dv: 2300 },
  { key: "potassium_mg", name: "Potassium", unit: "mg", kind: "fixed", group: "salts", off: "potassium", dv: 4700 },
  { key: "carbs_g", name: "Total carbs", unit: "g", kind: "core", group: "macros", off: "carbohydrates" },
  { key: "fiber_g", name: "Dietary fibre", unit: "g", kind: "fixed", sub: true, group: "macros", off: "fiber", dv: 28 },
  { key: "soluble_fiber_g", name: "Soluble fibre", unit: "g", kind: "extra", sub: true, group: "macros", off: "soluble-fiber" },
  { key: "insoluble_fiber_g", name: "Insoluble fibre", unit: "g", kind: "extra", sub: true, group: "macros", off: "insoluble-fiber" },
  { key: "sugar_g", name: "Sugars", unit: "g", kind: "fixed", sub: true, group: "macros", off: "sugars" },
  { key: "added_sugar_g", name: "Added sugars", unit: "g", kind: "extra", sub: true, group: "macros", off: "added-sugars", dv: 50 },
  { key: "polyols_g", name: "Sugar alcohols (polyols)", unit: "g", kind: "extra", sub: true, group: "macros", off: "polyols" },
  { key: "starch_g", name: "Starch", unit: "g", kind: "extra", sub: true, group: "macros", off: "starch" },
  { key: "protein_g", name: "Protein", unit: "g", kind: "core", group: "macros", off: "proteins" },
  { key: "salt_g", name: "Salt", unit: "g", kind: "extra", group: "salts" },
  { key: "chloride_mg", name: "Chloride", unit: "mg", kind: "extra", group: "salts", off: "chloride", dv: 2300 },
  { key: "vit_a_mcg", name: "Vitamin A", unit: "mcg", kind: "extra", group: "vitamins", off: "vitamin-a", dv: 900 },
  { key: "vit_c_mg", name: "Vitamin C", unit: "mg", kind: "extra", group: "vitamins", off: "vitamin-c", dv: 90 },
  { key: "vitamin_d_mcg", name: "Vitamin D", unit: "mcg", kind: "extra", group: "vitamins", off: "vitamin-d", dv: 20 },
  { key: "vit_e_mg", name: "Vitamin E", unit: "mg", kind: "extra", group: "vitamins", off: "vitamin-e", dv: 15 },
  { key: "vit_k_mcg", name: "Vitamin K", unit: "mcg", kind: "extra", group: "vitamins", off: "vitamin-k", dv: 120 },
  { key: "thiamin_mg", name: "Thiamin (B1)", unit: "mg", kind: "extra", group: "vitamins", off: "vitamin-b1", dv: 1.2 },
  { key: "riboflavin_mg", name: "Riboflavin (B2)", unit: "mg", kind: "extra", group: "vitamins", off: "vitamin-b2", dv: 1.3 },
  { key: "niacin_mg", name: "Niacin (B3)", unit: "mg", kind: "extra", group: "vitamins", off: "vitamin-pp", dv: 16 },
  { key: "pantothenic_mg", name: "Pantothenic acid (B5)", unit: "mg", kind: "extra", group: "vitamins", off: "pantothenic-acid", dv: 5 },
  { key: "vit_b6_mg", name: "Vitamin B6", unit: "mg", kind: "extra", group: "vitamins", off: "vitamin-b6", dv: 1.7 },
  { key: "biotin_mcg", name: "Biotin (B7)", unit: "mcg", kind: "extra", group: "vitamins", off: "biotin", dv: 30 },
  { key: "folate_mcg", name: "Folate (B9)", unit: "mcg", kind: "extra", group: "vitamins", off: "vitamin-b9", dv: 400 },
  { key: "vit_b12_mcg", name: "Vitamin B12", unit: "mcg", kind: "extra", group: "vitamins", off: "vitamin-b12", dv: 2.4 },
  { key: "choline_mg", name: "Choline", unit: "mg", kind: "extra", group: "vitamins", off: "choline", dv: 550 },
  { key: "calcium_mg", name: "Calcium", unit: "mg", kind: "extra", group: "minerals", off: "calcium", dv: 1300 },
  { key: "iron_mg", name: "Iron", unit: "mg", kind: "extra", group: "minerals", off: "iron", dv: 18 },
  { key: "magnesium_mg", name: "Magnesium", unit: "mg", kind: "extra", group: "minerals", off: "magnesium", dv: 420 },
  { key: "phosphorus_mg", name: "Phosphorus", unit: "mg", kind: "extra", group: "minerals", off: "phosphorus", dv: 1250 },
  { key: "zinc_mg", name: "Zinc", unit: "mg", kind: "extra", group: "minerals", off: "zinc", dv: 11 },
  { key: "copper_mg", name: "Copper", unit: "mg", kind: "extra", group: "minerals", off: "copper", dv: 0.9 },
  { key: "manganese_mg", name: "Manganese", unit: "mg", kind: "extra", group: "minerals", off: "manganese", dv: 2.3 },
  { key: "selenium_mcg", name: "Selenium", unit: "mcg", kind: "extra", group: "minerals", off: "selenium", dv: 55 },
  { key: "iodine_mcg", name: "Iodine", unit: "mcg", kind: "extra", group: "minerals", off: "iodine", dv: 150 },
  { key: "chromium_mcg", name: "Chromium", unit: "mcg", kind: "extra", group: "minerals", off: "chromium", dv: 35 },
  { key: "molybdenum_mcg", name: "Molybdenum", unit: "mcg", kind: "extra", group: "minerals", off: "molybdenum", dv: 45 },
  { key: "fluoride_mg", name: "Fluoride", unit: "mg", kind: "extra", group: "minerals", off: "fluoride" },
  { key: "caffeine_mg", name: "Caffeine", unit: "mg", kind: "extra", group: "other", off: "caffeine" },
  { key: "alcohol_g", name: "Alcohol", unit: "g", kind: "extra", group: "other" },
] as const satisfies readonly {
  key: string;
  name: string;
  unit: "kcal" | "g" | "mg" | "mcg";
  kind: "core" | "fixed" | "extra";
  sub?: boolean;
  group: "macros" | "salts" | "vitamins" | "minerals" | "other";
  off?: string;
  dv?: number;
}[];

export type NutrientInfo = (typeof NUTRIENTS)[number];
export type NutrientKey = NutrientInfo["key"];
export const NUTRIENT_KEYS = NUTRIENTS.map((n) => n.key) as NutrientKey[];
export const NUTRIENT_INFO = Object.fromEntries(NUTRIENTS.map((n) => [n.key, n])) as Record<NutrientKey, NutrientInfo>;

export const CORE_NUTRIENTS = ["kcal", "protein_g", "carbs_g", "fat_g"] as const satisfies readonly NutrientKey[];
type CoreKey = (typeof CORE_NUTRIENTS)[number];
export const EXTRA_NUTRIENTS = NUTRIENT_KEYS.filter(
  (k) => !(CORE_NUTRIENTS as readonly string[]).includes(k),
) as Exclude<NutrientKey, CoreKey>[];
/** Always shown on the food form: the standard label lines. */
export const FORM_NUTRIENTS = NUTRIENTS.filter((n) => n.kind !== "extra").map((n) => n.key) as NutrientKey[];

/** Nutrition values for one serving. */
export type Nutrients = { [K in CoreKey]: number } & { [K in Exclude<NutrientKey, CoreKey>]: number | null };

export const NUTRIENT_NAME = Object.fromEntries(NUTRIENTS.map((n) => [n.key, n.name])) as Record<NutrientKey, string>;
export const NUTRIENT_UNIT = Object.fromEntries(NUTRIENTS.map((n) => [n.key, n.unit])) as Record<NutrientKey, string>;
/** e.g. "Sodium (mg)". */
export const NUTRIENT_LABEL = Object.fromEntries(
  NUTRIENTS.map((n) => [n.key, `${n.name} (${n.unit})`]),
) as Record<NutrientKey, string>;
/** Indented under the line above, like on a label. */
export const SUB_NUTRIENTS = NUTRIENTS.filter((n) => "sub" in n && n.sub).map((n) => n.key) as NutrientKey[];

export const NUTRIENT_GROUPS = [
  { key: "macros", label: "Fats and carbs" },
  { key: "salts", label: "Salt and electrolytes" },
  { key: "vitamins", label: "Vitamins" },
  { key: "minerals", label: "Minerals" },
  { key: "other", label: "Other" },
] as const;

export interface Food extends Nutrients {
  id: string;
  created_by: string;
  name: string;
  brand: string | null;
  serving_label: string;
  barcode: string | null;
  source: FoodSource;
  label_photo_path: string | null;
  photo_path: string | null;
  /** Name in the original language, shown under the English name. */
  local_name: string | null;
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
  /** "About you", optional, used only to suggest a calorie goal. */
  sex: "female" | "male" | null;
  birth_year: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity: Activity | null;
  /** App owner: can approve any shared food, including their own. */
  is_admin?: boolean;
}

export type Activity = "little" | "light" | "moderate" | "very";
export const ACTIVITIES: { key: Activity; label: string; factor: number }[] = [
  { key: "little", label: "Mostly sitting (little exercise)", factor: 1.2 },
  { key: "light", label: "Lightly active (1–3 days a week)", factor: 1.375 },
  { key: "moderate", label: "Active (3–5 days a week)", factor: 1.55 },
  { key: "very", label: "Very active (6–7 days a week)", factor: 1.725 },
];

/** What the food form edits, before it becomes a Food row. */
export interface FoodDraft extends Nutrients {
  name: string;
  brand: string;
  serving_label: string;
  barcode: string | null;
  source: FoodSource;
  label_photo_path: string | null;
  photo_path: string | null;
  /** Name in the original language, shown under the English name. */
  local_name: string;
}

export function emptyDraft(source: FoodSource): FoodDraft {
  return {
    name: "",
    brand: "",
    serving_label: "1 serving",
    barcode: null,
    source,
    label_photo_path: null,
    photo_path: null,
    local_name: "",
    kcal: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    ...(Object.fromEntries(EXTRA_NUTRIENTS.map((k) => [k, null])) as Record<(typeof EXTRA_NUTRIENTS)[number], null>),
  };
}
