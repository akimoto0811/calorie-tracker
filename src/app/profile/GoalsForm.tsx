"use client";

import { useActionState, useState } from "react";
import { saveGoals } from "@/app/actions";
import { fmt, macroKcal } from "@/lib/nutrition";
import { goalWarning, suggestCalories } from "@/lib/goals";
import { ACTIVITIES, type Activity, type Profile } from "@/lib/types";
import { Alert } from "@/components/icons";

const MODES = [
  { key: "lose", label: "Lose" },
  { key: "maintain", label: "Maintain" },
  { key: "gain", label: "Gain" },
] as const;
type Mode = (typeof MODES)[number]["key"];

const ROWS = [
  { key: "protein_goal", label: "Protein", unit: "g", color: "var(--protein)" },
  { key: "carbs_goal", label: "Carbs", unit: "g", color: "var(--carbs)" },
  { key: "fat_goal", label: "Fat", unit: "g", color: "var(--fat)" },
  { key: "water_goal_ml", label: "Water", unit: "ml", color: "var(--water)" },
] as const;

export function GoalsForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState(saveGoals, null);
  const [mode, setMode] = useState<Mode>(profile.goal_mode);
  const [about, setAbout] = useState({
    sex: profile.sex ?? "",
    age: profile.birth_year ? String(new Date().getFullYear() - profile.birth_year) : "",
    height_cm: profile.height_cm ? String(profile.height_cm) : "",
    weight_kg: profile.weight_kg ? String(profile.weight_kg) : "",
    activity: profile.activity ?? "light",
  });
  const [vals, setVals] = useState({
    kcal_goal: String(profile.kcal_goal),
    protein_goal: String(profile.protein_goal),
    carbs_goal: String(profile.carbs_goal),
    fat_goal: String(profile.fat_goal),
    water_goal_ml: String(profile.water_goal_ml ?? 2000),
  });
  const n = (s: string) => Number(s.replace(",", ".")) || 0;
  const sex = about.sex === "female" || about.sex === "male" ? about.sex : null;
  const suggestion = suggestCalories(
    {
      sex,
      age: n(about.age) || null,
      height_cm: n(about.height_cm) || null,
      weight_kg: n(about.weight_kg) || null,
      activity: about.activity as Activity,
    },
    mode,
  );
  const warning = goalWarning(n(vals.kcal_goal), suggestion.kcal, mode, sex);
  const fromMacros = macroKcal(n(vals.protein_goal), n(vals.carbs_goal), n(vals.fat_goal));
  const diff = fromMacros - n(vals.kcal_goal);

  const small = { height: 42, padding: "0 10px", fontSize: 15 };

  return (
    <form action={action} className="stack" style={{ gap: 12 }}>
      <section className="card" style={{ gap: 10, padding: 14 }}>
        <div className="between">
          <h2 style={{ fontFamily: "var(--font)", fontSize: 15 }}>About you</h2>
          <span className="muted" style={{ fontSize: 12 }}>
            Optional · only you see it
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
          <div className="field" style={{ gap: 4 }}>
            <label htmlFor="sex" className="label" style={{ fontSize: 12 }}>
              Sex
            </label>
            <select
              id="sex"
              name="sex"
              className="input"
              style={{ ...small, paddingRight: 4 }}
              value={about.sex}
              onChange={(e) => setAbout({ ...about, sex: e.target.value })}
            >
              <option value="">–</option>
              <option value="female">F</option>
              <option value="male">M</option>
            </select>
          </div>
          {(
            [
              ["age", "Age", "numeric"],
              ["height_cm", "Height cm", "numeric"],
              ["weight_kg", "Weight kg", "decimal"],
            ] as const
          ).map(([key, label, mode]) => (
            <div key={key} className="field" style={{ gap: 4 }}>
              <label htmlFor={key} className="label" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                {label}
              </label>
              <input
                id={key}
                name={key}
                inputMode={mode}
                className="input"
                style={small}
                value={about[key]}
                onChange={(e) => setAbout({ ...about, [key]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <div className="field" style={{ gap: 4 }}>
          <label htmlFor="activity" className="label" style={{ fontSize: 12 }}>
            How active are you?
          </label>
          <select
            id="activity"
            name="activity"
            className="input"
            style={small}
            value={about.activity}
            onChange={(e) => setAbout({ ...about, activity: e.target.value as Activity })}
          >
            {ACTIVITIES.map((a) => (
              <option key={a.key} value={a.key}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="card" style={{ gap: 10, padding: 14 }}>
        <div className="between" style={{ alignItems: "center" }}>
          <h2 style={{ fontFamily: "var(--font)", fontSize: 15 }}>Daily goals</h2>
          <input type="hidden" name="goal_mode" value={mode} />
          <div className="seg" role="radiogroup" aria-label="Goal" style={{ width: 216, padding: 3, gap: 2 }}>
            {MODES.map((m) => (
              <button
                key={m.key}
                type="button"
                role="radio"
                aria-checked={mode === m.key}
                className={mode === m.key ? "on" : undefined}
                onClick={() => setMode(m.key)}
                style={{ minHeight: 32, fontSize: 13 }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="between" style={{ alignItems: "center" }}>
          <label htmlFor="kcal_goal" style={{ fontWeight: 600 }}>
            Calories
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              id="kcal_goal"
              name="kcal_goal"
              inputMode="numeric"
              value={vals.kcal_goal}
              onChange={(e) => setVals({ ...vals, kcal_goal: e.target.value })}
              className={warning ? "input uncertain" : "input"}
              aria-describedby={warning ? "kcal-warning" : undefined}
              style={{ width: 96, height: 42, textAlign: "right", fontWeight: 700 }}
            />
            <span className="muted" style={{ fontSize: 13, width: 30 }}>
              kcal
            </span>
          </div>
        </div>

        <div
          className="between"
          style={{ alignItems: "center", padding: "8px 8px 8px 12px", borderRadius: 12, background: "var(--green-soft)" }}
        >
          <span style={{ fontSize: 14 }}>
            Suggested: <b>{fmt(suggestion.kcal)} kcal</b>
          </span>
          <button
            type="button"
            className="btn btn-primary"
            style={{ height: 34, padding: "0 12px", fontSize: 14, borderRadius: 9, width: "auto", flexShrink: 0 }}
            onClick={() => setVals({ ...vals, kcal_goal: String(suggestion.kcal) })}
          >
            Use this
          </button>
        </div>

        {warning && (
          <div id="kcal-warning" className="notice warn" role="status">
            <Alert size={16} />
            <span>{warning}</span>
          </div>
        )}

        {ROWS.map((r) => (
          <div key={r.key} className="between" style={{ alignItems: "center" }}>
            <label htmlFor={r.key} style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
              <span className="swatch" style={{ background: r.color }} />
              {r.label}
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                id={r.key}
                name={r.key}
                inputMode="numeric"
                value={vals[r.key]}
                onChange={(e) => setVals({ ...vals, [r.key]: e.target.value })}
                className="input"
                style={{ width: 96, height: 42, textAlign: "right", fontWeight: 700 }}
              />
              <span className="muted" style={{ fontSize: 13, width: 30 }}>
                {r.unit}
              </span>
            </div>
          </div>
        ))}

        <p className="muted" style={{ fontSize: 12, lineHeight: 1.4 }}>
          Macros add up to {fmt(fromMacros)} kcal
          {Math.abs(diff) <= 50
            ? ", close to your calorie goal."
            : diff > 0
              ? `, ${fmt(diff)} more than your calorie goal.`
              : `, ${fmt(-diff)} less than your calorie goal.`}{" "}
          The suggestion uses the Mifflin-St Jeor formula
          {suggestion.personal ? "" : " once About you is filled in; until then, the US Dietary Guidelines (USDA/HHS) adult range"}. A
          guide, not medical advice.
        </p>

        <button className="btn btn-primary" disabled={pending} style={{ height: 48 }}>
          {pending ? <span className="spinner" /> : "Save goals"}
        </button>
        {state?.message && (
          <div className={state.ok ? "notice ok" : "notice error"} role="status">
            {state.message}
          </div>
        )}
      </section>
    </form>
  );
}
