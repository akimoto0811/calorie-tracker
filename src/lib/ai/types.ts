import type { NutrientKey } from "../types";

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
- Salt in grams. If only sodium is shown, salt = sodium × 2.5 (convert mg to g first).
- Use null for anything not on the label. Never guess a number you cannot see.
- Put the field name in "uncertain" for every value that is blurry, cut off, ambiguous, or that you computed/converted.
  Allowed field names: name, brand, serving_label, kcal, protein_g, carbs_g, fat_g, sat_fat_g, sugar_g, fiber_g, salt_g.
- name / brand: read them from the packaging if visible, otherwise null.
- note: one short sentence for the user if something needs their attention, otherwise null.`;
