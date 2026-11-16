import { fmt } from "@/lib/nutrition";
import {
  CORE_NUTRIENTS,
  NUTRIENT_KEYS,
  NUTRIENT_NAME,
  NUTRIENT_UNIT,
  SUB_NUTRIENTS,
  type NutrientKey,
} from "@/lib/types";

/** Read-only nutrition values in label order. Optional lines that are empty are left out. */
export function NutritionTable({ values }: { values: Record<NutrientKey, number | string | null> }) {
  const keys = NUTRIENT_KEYS.filter(
    (k) => (CORE_NUTRIENTS as readonly string[]).includes(k) || (values[k] !== null && values[k] !== undefined),
  );
  return (
    <div>
      {keys.map((k) => (
        <div key={k} className="nrow">
          <span style={SUB_NUTRIENTS.includes(k) ? { paddingLeft: 16, color: "var(--muted)" } : undefined}>
            {NUTRIENT_NAME[k]}
          </span>
          <b>
            {fmt(Number(values[k]), k === "kcal" ? 0 : 1)} {NUTRIENT_UNIT[k]}
          </b>
        </div>
      ))}
    </div>
  );
}
