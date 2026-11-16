import { NUTRIENTS, NUTRIENT_KEYS, type NutrientKey } from "../types";

/** What an AI provider returns after reading a nutrition label photo. All values per serving. */
export interface LabelReading {
  name: string | null;
  local_name: string | null;
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
- Fill in every row the label has, including indented rows (saturated fat, fibre, sugars…) and every vitamin and mineral.
- Each field name ends in its unit: _g grams, _mg milligrams, _mcg micrograms. Convert to that unit if the label uses another.
- Sodium in mg. Only fill salt_g if the label itself shows salt; if it shows only salt, also set sodium_mg = salt in grams × 400.
- sugar_g is total sugars; added_sugar_g is "Includes Xg Added Sugars".
- Vitamin D: if only IU is shown, mcg = IU ÷ 40. Vitamin A in mcg RAE. Folate in mcg DFE.
- If a nutrient only shows a % Daily Value, convert it with these US daily values (and list it in "uncertain"):
  ${NUTRIENTS.filter((n) => "dv" in n).map((n) => `${n.key} ${(n as { dv: number }).dv}`).join(", ")}.
- Return the values in "nutrients" as a list of { "field": <a nutrient field name from the list below>, "value": <number> }, one entry per value on the label.
  Leave out anything not on the label. Never guess a number you cannot see.
- Put the field name in "uncertain" for every value that is blurry, cut off, ambiguous, or that you computed/converted.
  Allowed field names: name, brand, serving_label, ${NUTRIENT_KEYS.join(", ")}.
- name: the product name in English. If the packaging is in another language and shows no English name, translate it into short, plain English.
- local_name: the product name as printed in its original language and script (e.g. 고래밥, ポッキー), only if it isn't English; otherwise null.
- brand: read it from the packaging if visible, otherwise null.
- note: one short sentence for the user if something needs their attention, otherwise null.`;
