import { NUTRIENT_KEYS, type NutrientKey } from "../types";

/** What an AI provider returns after reading a nutrition label photo. All values per serving. */
export interface LabelReading {
  name: string | null;
  brand: string | null;
  serving_label: string | null;
  values: Partial<Record<NutrientKey, number | null>>;
  /** Fields the model could not read clearly. The UI highlights these. */
  uncertain: string[];
  /** Short note for the user, e.g. "Values were per 100 g; converted to one 30 g serving." */
  note: string | null;
}

export interface LabelReader {
  readonly name: string;
  readLabel(image: { data: Buffer; mimeType: string }): Promise<LabelReading>;
}

export const LABEL_PROMPT = `You read photos of food nutrition labels (any country, any language).
Return the nutrition values for ONE SERVING as printed on the label.
- If the label only gives values per 100 g / 100 ml, use those and set serving_label to "100 g" or "100 ml".
- If it gives both per 100 g and per serving, use the per-serving column and describe the serving in serving_label (e.g. "1 bar (40 g)").
- Energy must be in kcal. If only kJ is shown, divide by 4.184.
- Fill in every row the label has, including the indented ones and the vitamins and minerals at the bottom.
- Units: grams for fat, carbs, fibre, sugars and protein; mg for cholesterol, sodium, calcium, iron and potassium; mcg for vitamin D.
- Sodium in mg. If only salt is shown, sodium_mg = salt in grams × 400.
- sugar_g is total sugars; added_sugar_g is "Includes Xg Added Sugars".
- Vitamin D: if only IU is shown, mcg = IU ÷ 40.
- If a vitamin or mineral only shows a % Daily Value, convert it with these daily values: vitamin D 20 mcg, calcium 1300 mg, iron 18 mg, potassium 4700 mg.
- Use null for anything not on the label. Never guess a number you cannot see.
- Put the field name in "uncertain" for every value that is blurry, cut off, ambiguous, or that you computed/converted.
  Allowed field names: name, brand, serving_label, ${NUTRIENT_KEYS.join(", ")}.
- name / brand: read them from the packaging if visible, otherwise null.
- note: one short sentence for the user if something needs their attention, otherwise null.`;
