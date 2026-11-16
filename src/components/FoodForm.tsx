"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createFood, createFoodAndLog } from "@/app/actions";
import { amountText, fmt } from "@/lib/nutrition";
import {
  CORE_NUTRIENTS,
  MEALS,
  MEAL_LABEL,
  EXTRA_NUTRIENTS,
  NUTRIENTS,
  NUTRIENT_INFO,
  NUTRIENT_LABEL,
  NUTRIENT_NAME,
  NUTRIENT_UNIT,
  SUB_NUTRIENTS,
  type FoodDraft,
  type Meal,
  type NutrientKey,
} from "@/lib/types";
import { Alert, Close, Plus } from "./icons";
import { NutrientPicker } from "./NutrientPicker";
import { MealChips, ServingsStepper } from "./LogControls";
import { ServingInput } from "./ServingInput";

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
  // A new, empty food starts with a sensible serving: 250 ml for drinks, 100 g otherwise.
  const [draft, setDraft] = useState<FoodDraft>(() =>
    initial.serving_label === "1 serving" && !initial.name
      ? { ...initial, serving_label: initialMeal === "drinks" ? "250 ml" : "100 g" }
      : initial,
  );
  const [meal, setMeal] = useState<Meal>(initialMeal);
  const [servings, setServings] = useState(1);
  const [share, setShare] = useState(allowShare && defaultShare);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [doing, setDoing] = useState<"log" | "save">("log");
  // Fields still flagged as uncertain. Editing a field clears its flag.
  const [flagged, setFlagged] = useState<Set<string>>(() => new Set(uncertain));

  // What's typed in each nutrient box, so the form and the picker sheet always agree.
  const [raw, setRaw] = useState<Partial<Record<NutrientKey, string>>>(() =>
    Object.fromEntries(
      Object.entries(initial)
        .filter(([k, v]) => (NUTRIENT_INFO as Record<string, unknown>)[k] && v !== null && v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    ),
  );
  // Extra nutrients shown on the form: ones with a value (e.g. read from a label) or flagged.
  const [added, setAdded] = useState<Set<NutrientKey>>(
    () => new Set(EXTRA_NUTRIENTS.filter((k) => NUTRIENT_INFO[k].kind === "extra" && (initial[k] !== null || uncertain.includes(k)))),
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  const flaggedList = useMemo(() => [...flagged] as Field[], [flagged]);

  function set<K extends keyof FoodDraft>(key: K, value: FoodDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    if (flagged.has(key as string)) {
      const next = new Set(flagged);
      next.delete(key as string);
      setFlagged(next);
    }
  }

  function setNum(key: NutrientKey, text: string) {
    setRaw((r) => ({ ...r, [key]: text }));
    if (NUTRIENT_INFO[key].kind === "extra" && text.trim() !== "" && !added.has(key)) {
      setAdded(new Set(added).add(key));
    }
    const s = text.replace(",", ".");
    if (s.trim() === "") return set(key, ((CORE_NUTRIENTS as readonly string[]).includes(key) ? 0 : null) as never);
    const n = Number(s);
    if (Number.isFinite(n) && n >= 0) set(key, n as never);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDoing("log");
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

  /** Save the food without logging it. */
  function saveOnly() {
    setError(null);
    if (!draft.name.trim()) {
      setError("Give the food a name.");
      document.getElementById("f-name")?.focus();
      return;
    }
    setDoing("save");
    start(async () => {
      const r = await createFood({ draft, share });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.push("/library?f=mine");
      router.refresh();
    });
  }

  /** One line of the Nutrition Facts table: name on the left, amount and unit on the right. */
  const nfRow = (key: NutrientKey) => {
    const sub = SUB_NUTRIENTS.includes(key);
    return (
      <div key={key} className={`nf-row${sub ? " sub" : ""}${key === "kcal" ? " kcal" : ""}`}>
        <label htmlFor={`f-${key}`}>{NUTRIENT_NAME[key]}</label>
        <div className="nf-input">
          <input
            id={`f-${key}`}
            className={flagged.has(key) ? "input uncertain" : "input"}
            aria-describedby={flagged.has(key) ? "uncertain-note" : undefined}
            inputMode="decimal"
            placeholder={(CORE_NUTRIENTS as readonly string[]).includes(key) ? "0" : "–"}
            value={raw[key] ?? ""}
            onChange={(e) => setNum(key, e.target.value)}
          />
          <span aria-hidden="true">{NUTRIENT_UNIT[key]}</span>
        </div>
        {NUTRIENT_INFO[key].kind === "extra" ? (
          <button type="button" className="nf-remove" aria-label={`Remove ${NUTRIENT_NAME[key]}`} onClick={() => removeExtra(key)}>
            <Close size={16} />
          </button>
        ) : (
          <span className="nf-remove" aria-hidden="true" />
        )}
      </div>
    );
  };

  function removeExtra(key: NutrientKey) {
    setNum(key, "");
    const next = new Set(added);
    next.delete(key);
    setAdded(next);
  }

  function closePicker() {
    setPickerOpen(false);
    // Lines left empty in the sheet don't stay on the form.
    setAdded(new Set([...added].filter((k) => (raw[k] ?? "").trim() !== "")));
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
        <div className="span2">{input("brand", { placeholder: "Optional", autoComplete: "off" })}</div>
        <div className="span2">
          <ServingInput
            value={draft.serving_label}
            onChange={(v) => set("serving_label", v)}
            flagged={flagged.has("serving_label")}
          />
        </div>
      </div>

      <div className="card nf" style={{ padding: 16, gap: 0, borderRadius: 16 }}>
        <div className="nf-head">
          <span>Nutrition facts</span>
          <span className="muted small">Per serving ({draft.serving_label})</span>
        </div>
        <div className="nf-sub-head">Amount per serving</div>
        {NUTRIENTS.filter((n) => n.kind !== "extra" || added.has(n.key)).map((n) => nfRow(n.key))}
        <button type="button" className="nf-add" onClick={() => setPickerOpen(true)}>
          <Plus size={18} />
          Add more nutrients
        </button>
        <p className="muted small" style={{ marginTop: 10 }}>
          Leave a line empty if it isn&apos;t on the label.
        </p>
        {flaggedList.length > 0 && (
          <div
            id="uncertain-note"
            style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, lineHeight: 1.4, color: "var(--warn-text)", marginTop: 10 }}
          >
            <Alert size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              {listify(flaggedList.map(plainName))} {flaggedList.length === 1 ? "was" : "were"} hard to read in
              the photo. Please double-check {flaggedList.length === 1 ? "it" : "them"}.
            </span>
          </div>
        )}
      </div>

      <div className="card tight" style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 700 }}>How much did you have?</div>
          <div className="muted small">
            {amountText(draft.serving_label, servings)} · {fmt(draft.kcal * servings)} kcal
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
        {pending && doing === "log" ? <span className="spinner" /> : `Add to ${MEAL_LABEL[meal]}`}
      </button>
      <div className="stack" style={{ gap: 6, marginTop: -6 }}>
        <button type="button" className="btn btn-secondary" disabled={pending} style={{ height: 50 }} onClick={saveOnly}>
          {pending && doing === "save" ? <span className="spinner" /> : "Save to library only"}
        </button>
        <p className="muted small" style={{ textAlign: "center" }}>
          {share && allowShare
            ? "Saves the food without logging it. A friend reviews it, then everyone can use it."
            : "Saves the food to your own foods without logging it."}
        </p>
      </div>
      {pickerOpen && <NutrientPicker raw={raw} flagged={flagged} onChange={setNum} onClose={closePicker} />}
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
