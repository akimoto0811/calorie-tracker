"use client";

import { NutritionTable } from "@/components/NutritionTable";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewFood } from "@/app/actions";
import { FORM_NUTRIENTS, NUTRIENT_KEYS, NUTRIENT_LABEL, type Food, type NutrientKey } from "@/lib/types";
import { Alert, Check } from "@/components/icons";

const SOURCE_LABEL = { manual: "Entered by hand", label: "Read from label photo", barcode: "From barcode" } as const;

export function ReviewCard({
  food,
  by,
  ago,
  photoUrl,
  similar,
}: {
  food: Food;
  by: string;
  ago: string;
  photoUrl: string | null;
  similar: string | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "fix" | "reject">("view");
  const [fixes, setFixes] = useState({
    name: food.name,
    brand: food.brand ?? "",
    serving_label: food.serving_label,
    ...Object.fromEntries(
      NUTRIENT_KEYS.map((k) => [k, food[k] === null ? "" : String(food[k])]),
    ),
  } as Record<string, string>);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [zoom, setZoom] = useState(false);

  function decide(decision: "approve" | "reject") {
    setError(null);
    start(async () => {
      const r = await reviewFood({
        foodId: food.id,
        decision,
        fixes:
          decision === "approve" && mode === "fix"
            ? (Object.fromEntries(
                Object.entries(fixes).map(([k, v]) => [k, NUTRIENT_LABEL[k as NutrientKey] ? (v === "" ? null : Number(v.replace(",", "."))) : v]),
              ) as never)
            : null,
        note: note.trim() || null,
      });
      if (!r.ok) return setError(r.error);
      router.refresh();
    });
  }


  return (
    <>
      <article className="card" style={{ padding: 18 }}>
        <div style={{ display: "flex", gap: 14 }}>
          {photoUrl ? (
            <button
              type="button"
              onClick={() => setZoom(true)}
              style={{ padding: 0, border: 0, background: "none", cursor: "zoom-in" }}
              aria-label="Zoom label photo"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt="Label photo" className="photo-thumb" style={{ width: 96, height: 120 }} />
            </button>
          ) : null}
          <div className="stack" style={{ gap: 6 }}>
            <h2 style={{ fontFamily: "var(--font)", fontSize: 19 }}>{food.name}</h2>
            <div className="muted" style={{ fontSize: 14 }}>
              {food.brand ? `${food.brand} · ` : ""}
              {food.serving_label} serving
            </div>
            <div className="muted small">
              Sent by {by} · {ago}
            </div>
            <span className="tag green" style={{ alignSelf: "flex-start", height: 24 }}>
              {SOURCE_LABEL[food.source]}
            </span>
          </div>
        </div>

        {mode === "fix" ? (
          <div className="grid2">
            {(["name", "brand", "serving_label"] as const).map((k) => (
              <div key={k} className={k === "name" ? "field span2" : "field"}>
                <label htmlFor={`r-${k}`} className="label">
                  {k === "name" ? "Food name" : k === "brand" ? "Brand" : "Serving"}
                </label>
                <input
                  id={`r-${k}`}
                  className="input"
                  value={fixes[k]}
                  onChange={(e) => setFixes({ ...fixes, [k]: e.target.value })}
                />
              </div>
            ))}
            {NUTRIENT_KEYS.filter((k) => FORM_NUTRIENTS.includes(k) || food[k] !== null).map((k) => (
              <div key={k} className="field">
                <label htmlFor={`r-${k}`} className="label">
                  {NUTRIENT_LABEL[k]}
                </label>
                <input
                  id={`r-${k}`}
                  className="input"
                  inputMode="decimal"
                  value={fixes[k]}
                  onChange={(e) => setFixes({ ...fixes, [k]: e.target.value })}
                />
              </div>
            ))}
          </div>
        ) : (
          <NutritionTable values={food} />
        )}

        {similar && (
          <div className="notice warn">
            <Alert size={16} />
            <span>
              Looks similar to “{similar}” already in the library. Approving adds it as a separate food.
            </span>
          </div>
        )}
      </article>

      {mode === "reject" && (
        <div className="field">
          <label htmlFor="note" className="label">
            Why not? (optional, {by} will see this)
          </label>
          <input id="note" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. numbers don't match the photo" />
        </div>
      )}

      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}

      <div className="stack" style={{ marginTop: "auto" }}>
        {mode === "reject" ? (
          <>
            <button className="btn btn-danger" disabled={pending} onClick={() => decide("reject")}>
              {pending ? <span className="spinner" /> : "Reject this food"}
            </button>
            <button className="btn btn-secondary" disabled={pending} onClick={() => setMode("view")}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-primary" style={{ height: 54 }} disabled={pending} onClick={() => decide("approve")}>
              {pending ? (
                <span className="spinner" />
              ) : (
                <>
                  <Check size={20} />
                  {mode === "fix" ? "Save fixes and publish" : "Approve and publish"}
                </>
              )}
            </button>
            <div className="grid2" style={{ gap: 10 }}>
              <button className="btn btn-secondary" disabled={pending} onClick={() => setMode(mode === "fix" ? "view" : "fix")}>
                {mode === "fix" ? "Cancel fixes" : "Fix numbers"}
              </button>
              <button className="btn btn-danger" disabled={pending} onClick={() => setMode("reject")}>
                Reject
              </button>
            </div>
          </>
        )}
      </div>

      {zoom && photoUrl && (
        <div
          role="dialog"
          aria-label="Label photo"
          onClick={() => setZoom(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            cursor: "zoom-out",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl} alt="Label photo, full size" style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 8 }} />
        </div>
      )}
    </>
  );
}
