"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logFood } from "@/app/actions";
import { fmt } from "@/lib/nutrition";
import { MEAL_LABEL, type Meal } from "@/lib/types";
import { MealChips, ServingsStepper } from "@/components/LogControls";

export function LogExisting(props: {
  foodId: string;
  kcal: number;
  servingLabel: string;
  meal: Meal;
  date: string;
  today: string;
}) {
  const router = useRouter();
  const [meal, setMeal] = useState(props.meal);
  const [servings, setServings] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="stack" style={{ gap: 18 }}>
      <MealChips value={meal} onChange={setMeal} />
      <div className="card tight" style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 700 }}>How much did you have?</div>
          <div className="muted small">
            {fmt(servings, 2)} × {props.servingLabel} = {fmt(props.kcal * servings)} kcal
          </div>
        </div>
        <ServingsStepper value={servings} onChange={setServings} />
      </div>
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      <button
        className="btn btn-primary"
        style={{ height: 54 }}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await logFood({ foodId: props.foodId, servings, meal, date: props.date });
            if (!r.ok) return setError(r.error);
            router.push(props.date === props.today ? "/" : `/?date=${props.date}`);
            router.refresh();
          })
        }
      >
        {pending ? <span className="spinner" /> : `Add to ${MEAL_LABEL[meal]}`}
      </button>
    </div>
  );
}
