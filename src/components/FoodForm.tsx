"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createFoodAndLog } from "@/app/actions";
import { fmt } from "@/lib/nutrition";
import {
  CORE_NUTRIENTS,
  EXTRA_NUTRIENTS,
  MEALS,
  MEAL_LABEL,
  NUTRIENT_LABEL,
  type FoodDraft,
  type Meal,
  type NutrientKey,
} from "@/lib/types";
import { Alert } from "./icons";
import { MealChips, ServingsStepper } from "./LogControls";

type Field = NutrientKey | "name" | "brand" | "serving_label";

const FIELD_NAME: Record<Field, string> = {
  ...NUTRIENT_LABEL,
  name: "Food name",
  brand: "Brand",
  serving_label: "Serving",
};

function plainName(f: Field) {
  return FIELD_NAME[f].replace(/ \(.*\)$/, "").toLowerCase();
}

export function FoodForm({
  initial,
  meal: initialMeal,
  date,
  today,
  uncertain = [],
  defaultShare = true,
  allowShare = true,
}: {
  initial: FoodDraft;
  meal: Meal;
  date: string;
  today: string;
  uncertain?: string[];
  defaultShare?: boolean;
  allowShare?: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<FoodDraft>(initial);
  const [meal, setMeal] = useState<Meal>(initialMeal);
  const [servings, setServings] = useState(1);
  const [share, setShare] = useState(allowShare && defaultShare);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // Fields still flagged as uncertain. Editing a field clears its flag.
  const [flagged, setFlagged] = useState<Set<string>>(() => new Set(uncertain));
  const hasExtraValues = EXTRA_NUTRIENTS.some((k) => initial[k] !== null);
  const [showExtras, setShowExtras] = useState(
    hasExtraValues || EXTRA_NUTRIENTS.some((k) => uncertain.includes(k)),
  );

  const flaggedList = useMemo(() => [...flagged] as Field[], [flagged]);

  function set<K extends keyof FoodDraft>(key: K, value: FoodDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    if (flagged.has(key as string)) {
      const next = new Set(flagged);
      next.delete(key as string);
      setFlagged(next);
    }
  }

  function setNum(key: NutrientKey, raw: string) {
    const s = raw.replace(",", ".");
    if (s.trim() === "") return set(key, (CORE_NUTRIENTS.includes(key) ? 0 : null) as never);
    const n = Number(s);
    if (Number.isFinite(n) && n >= 0) set(key, n as never);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await createFoodAndLog({ draft, share, servings, meal, date });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.push(date === today ? "/" : `/?date=${date}`);
      router.refresh();
    });
  }

  const input = (key: Field, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => {
    const isNum = !(key === "name" || key === "brand" || key === "serving_label");
    const v = draft[key as keyof FoodDraft];
    return (
      <div className="field">
        <label htmlFor={`f-${key}`} className="label">
          {FIELD_NAME[key]}
        </label>
        <input
          id={`f-${key}`}
          className={flagged.has(key) ? "input uncertain" : "input"}
          aria-describedby={flagged.has(key) ? "uncertain-note" : undefined}
          {...(isNum
            ? {
                inputMode: "decimal" as const,
                defaultValue: v === null || v === undefined ? "" : String(v),
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => setNum(key as NutrientKey, e.target.value),
              }
            : {
                value: (v as string) ?? "",
                onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                  set(key as "name" | "brand" | "serving_label", e.target.value),
              })}
          {...props}
        />
      </div>
    );
  };

  return (
    <form onSubmit={submit} className="stack" style={{ gap: 18 }}>
      <MealChips value={meal} onChange={setMeal} />

      <div className="grid2">
        <div className="span2">{input("name", { required: true, autoComplete: "off" })}</div>
        {input("brand", { placeholder: "Optional", autoComplete: "off" })}
        {input("serving_label", { placeholder: "e.g. 250 ml", autoComplete: "off" })}
      </div>

      <div className="card" style={{ padding: 16, gap: 12, borderRadius: 16 }}>
        <div style={{ fontWeight: 700 }}>Per serving</div>
        <div className="grid2">{CORE_NUTRIENTS.map((k) => <div key={k}>{input(k)}</div>)}</div>
        {showExtras && (
          <div className="grid2">{EXTRA_NUTRIENTS.map((k) => <div key={k}>{input(k, { placeholder: "–" })}</div>)}</div>
        )}
        {flaggedList.length > 0 && (
          <div
            id="uncertain-note"
            style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, lineHeight: 1.4, color: "var(--warn-text)" }}
          >
            <Alert size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              {listify(flaggedList.map(plainName))} {flaggedList.length === 1 ? "was" : "were"} hard to read in
              the photo. Please double-check {flaggedList.length === 1 ? "it" : "them"}.
            </span>
          </div>
        )}
        {!showExtras && (
          <button type="button" className="link-btn" style={{ alignSelf: "flex-start" }} onClick={() => setShowExtras(true)}>
            Show saturated fat, sugar, fibre, salt
          </button>
        )}
      </div>

      <div className="card tight" style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 700 }}>How much did you have?</div>
          <div className="muted small">
            {fmt(servings, 2)} × {draft.serving_label || "serving"} = {fmt(draft.kcal * servings)} kcal
          </div>
        </div>
        <ServingsStepper value={servings} onChange={setServings} />
      </div>

      {allowShare && (
        <label className="share-box">
          <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} />
          <span className="stack" style={{ gap: 2 }}>
            <span style={{ fontWeight: 700 }}>Share with the food library</span>
            <span style={{ fontSize: 13, lineHeight: 1.4, color: "#3d5248" }}>
              A friend reviews it first. Only the food goes in, never your log.
            </span>
          </span>
        </label>
      )}

      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}

      <button className="btn btn-primary" disabled={pending} style={{ height: 54 }}>
        {pending ? <span className="spinner" /> : `Add to ${MEAL_LABEL[meal]}`}
      </button>
    </form>
  );
}

function listify(items: string[]) {
  if (items.length <= 1) return cap(items[0] ?? "");
  return cap(items.slice(0, -1).join(", ") + " and " + items[items.length - 1]);
}
function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export { MEALS };
