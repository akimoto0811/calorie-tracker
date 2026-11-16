"use client";

import { useEffect, useRef, useState } from "react";
import { NUTRIENTS, NUTRIENT_GROUPS, type NutrientKey } from "@/lib/types";
import { Search } from "./icons";

/**
 * Bottom sheet listing every optional nutrient a label can show.
 * Typing an amount here adds it to the food; empty lines are dropped when the sheet closes.
 */
export function NutrientPicker({
  raw,
  flagged,
  onChange,
  onClose,
}: {
  raw: Partial<Record<NutrientKey, string>>;
  flagged: Set<string>;
  onChange: (key: NutrientKey, value: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const term = q.trim().toLowerCase();
  const filled = NUTRIENTS.filter((n) => n.kind === "extra" && (raw[n.key] ?? "").trim() !== "").length;
  const groups = NUTRIENT_GROUPS.map((g) => ({
    ...g,
    items: NUTRIENTS.filter((n) => n.kind === "extra" && n.group === g.key && (!term || n.name.toLowerCase().includes(term))),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="sheet-wrap">
      <button type="button" className="sheet-backdrop" aria-label="Close" tabIndex={-1} onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="picker-title">
        <div className="sheet-head">
          <div className="sheet-grip" aria-hidden="true" />
          <div className="between" style={{ alignItems: "center" }}>
            <h2 id="picker-title" style={{ fontSize: 20 }}>
              Add more nutrients
            </h2>
            <button type="button" className="btn btn-primary" style={{ height: 40, padding: "0 16px", width: "auto", flexShrink: 0 }} onClick={onClose}>
              {filled ? `Done (${filled})` : "Done"}
            </button>
          </div>
          <p className="muted" style={{ fontSize: 13 }}>
            Type the amount from your label. Anything you fill in is added to the food.
          </p>
          <div className="search" style={{ height: 46 }}>
            <Search className="muted" />
            <label htmlFor="nutrient-search" className="sr-only">
              Search nutrients
            </label>
            <input
              ref={searchRef}
              id="nutrient-search"
              type="search"
              placeholder="Search, e.g. vitamin C, zinc"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
        <div className="sheet-body">
          {groups.length === 0 && <p className="muted small">No nutrient matches that. Try another name.</p>}
          {groups.map((g) => (
            <section key={g.key}>
              <h3 className="sheet-group">{g.label}</h3>
              {g.items.map((n) => {
                const v = raw[n.key] ?? "";
                const on = v.trim() !== "";
                return (
                  <div key={n.key} className={on ? "pick-row on" : "pick-row"}>
                    <label htmlFor={`p-${n.key}`} className="grow">
                      <span style={{ fontWeight: 600 }}>{n.name}</span>
                      <span className="muted" style={{ fontSize: 12 }}>
                        {on ? "Added to the food" : n.unit}
                      </span>
                    </label>
                    <div className="nf-input" style={{ width: 112 }}>
                      <input
                        id={`p-${n.key}`}
                        className={flagged.has(n.key) ? "input uncertain" : "input"}
                        inputMode="decimal"
                        placeholder="–"
                        value={v}
                        onChange={(e) => onChange(n.key, e.target.value)}
                      />
                      <span aria-hidden="true">{n.unit}</span>
                    </div>
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
