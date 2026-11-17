"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeLog, updateLog } from "@/app/actions";
import type { Meal } from "@/lib/types";
import { AmountEaten, MealChips } from "@/components/LogControls";

export function EditLog(props: {
  id: string;
  meal: Meal;
  servings: number;
  kcalPerServing: number;
  servingLabel: string;
  backHref: string;
}) {
  const router = useRouter();
  const [meal, setMeal] = useState(props.meal);
  const [servings, setServings] = useState(props.servings);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const changed = meal !== props.meal || servings !== props.servings;

  function done() {
    router.push(props.backHref);
    router.refresh();
  }

  return (
    <section className="stack" style={{ gap: 14 }}>
      <h2>Change it</h2>
      <MealChips value={meal} onChange={setMeal} />
      <AmountEaten
        servingLabel={props.servingLabel}
        kcal={props.kcalPerServing}
        servings={servings}
        onChange={setServings}
      />
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      <button
        className="btn btn-primary"
        style={{ height: 54 }}
        disabled={pending || !changed}
        onClick={() =>
          start(async () => {
            const r = await updateLog({ id: props.id, servings, meal });
            if (!r.ok) return setError(r.error);
            done();
          })
        }
      >
        {pending ? <span className="spinner" /> : "Save changes"}
      </button>
      <button
        className="link-btn danger"
        style={{ alignSelf: "center" }}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await removeLog(props.id);
            if (!r.ok) return setError(r.error);
            done();
          })
        }
      >
        Remove from log
      </button>
    </section>
  );
}
