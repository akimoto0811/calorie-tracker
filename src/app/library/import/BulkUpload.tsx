"use client";

import Link from "next/link";
import { useState } from "react";
import { importFoods } from "@/app/actions";
import { parseFoods, templateCsv, type ImportResult } from "@/lib/foodImport";
import { fmt } from "@/lib/nutrition";

const CHUNK = 500;
const PREVIEW_LIMIT = 30;

function download(kind: "basic" | "full") {
  const blob = new Blob(["﻿" + templateCsv(kind)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = kind === "basic" ? "food-library-template.csv" : "food-library-template-all-nutrients.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function BulkUpload() {
  const [paste, setPaste] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ImportResult | null>(null);
  const [saving, setSaving] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ added: number; skipped: string[] } | null>(null);

  function check(text: string, name: string | null) {
    setFileName(name);
    setError(null);
    setDone(null);
    setParsed(parseFoods(text));
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (/\.(xlsx?|numbers|ods)$/i.test(file.name)) {
      setParsed(null);
      setError(
        "That's a spreadsheet file, not a CSV. In your spreadsheet app choose File → Download (or Save as / Export) → CSV, then upload that file. Or copy the rows and paste them below.",
      );
      return;
    }
    check(await file.text(), file.name);
  }

  function reset() {
    setParsed(null);
    setFileName(null);
    setPaste("");
    setError(null);
  }

  const good = parsed?.rows.filter((r) => r.errors.length === 0) ?? [];
  const bad = parsed?.rows.filter((r) => r.errors.length > 0) ?? [];

  async function save() {
    const foods = good.map((r) => r.food);
    setError(null);
    setSaving({ done: 0, total: foods.length });
    let added = 0;
    const skipped: string[] = [];
    for (let i = 0; i < foods.length; i += CHUNK) {
      const res = await importFoods(foods.slice(i, i + CHUNK));
      if (!res.ok) {
        setSaving(null);
        setError(
          added > 0
            ? `${added} foods were added, then this went wrong: ${res.error} Upload the same file again to add the rest; foods already added are skipped.`
            : res.error,
        );
        return;
      }
      added += res.added;
      skipped.push(...res.skipped);
      setSaving({ done: Math.min(i + CHUNK, foods.length), total: foods.length });
    }
    setSaving(null);
    setParsed(null);
    setFileName(null);
    setPaste("");
    setDone({ added, skipped });
  }

  if (done) {
    return (
      <section className="card">
        <h2 style={{ fontFamily: "var(--font)", fontSize: 18 }}>
          {done.added === 1 ? "1 food added" : `${done.added} foods added`} to the library
        </h2>
        <p className="muted small">They&apos;re live now, so everyone can find and log them.</p>
        {done.skipped.length > 0 && (
          <div className="notice warn">
            <div>
              {done.skipped.length === 1 ? "1 food was" : `${done.skipped.length} foods were`} skipped because the
              library already has a food with the same name and brand: {done.skipped.slice(0, 20).join(", ")}
              {done.skipped.length > 20 ? ` and ${done.skipped.length - 20} more` : ""}.
            </div>
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/library" className="btn btn-primary">
            Open the library
          </Link>
          <button className="btn btn-secondary" onClick={() => setDone(null)}>
            Upload more
          </button>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="card">
        <h2 style={{ fontFamily: "var(--font)", fontSize: 16 }}>1. Get the template</h2>
        <p className="muted small">
          Open it in Google Sheets, Excel or Numbers and add one food per row. Values are for one serving. Only Name
          and Calories are required; leave any other box empty if you don&apos;t know it.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-secondary" style={{ flex: "1 1 160px", height: 44, fontSize: 15 }} onClick={() => download("basic")}>
            Template
          </button>
          <button className="btn btn-secondary" style={{ flex: "1 1 160px", height: 44, fontSize: 15 }} onClick={() => download("full")}>
            With all nutrients
          </button>
        </div>
        <p className="muted small">
          Keep the first row (the column names) as it is. You can delete columns you don&apos;t need.
        </p>
      </section>

      <section className="card">
        <h2 style={{ fontFamily: "var(--font)", fontSize: 16 }}>2. Upload it</h2>
        <label className="btn btn-primary" style={{ height: 48 }}>
          Choose CSV file
          <input type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" onChange={onFile} className="sr-only" />
        </label>
        <div className="field">
          <label htmlFor="paste" className="label">
            Or copy the rows in your spreadsheet (including the first row) and paste them here
          </label>
          <textarea
            id="paste"
            className="input"
            style={{ height: 110, padding: 12, fontSize: 14, fontFamily: "inherit", resize: "vertical" }}
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder={"Name\tBrand\tServing\tCalories (kcal)\t…"}
          />
          {paste.trim() && (
            <button className="btn btn-secondary" style={{ height: 44, fontSize: 15 }} onClick={() => check(paste, null)}>
              Check pasted rows
            </button>
          )}
        </div>
        {error && !parsed && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}
      </section>

      {parsed && (
        <section className="card" aria-live="polite">
          <div className="stack" style={{ gap: 4 }}>
            <h2 style={{ fontFamily: "var(--font)", fontSize: 16 }}>3. Check and add</h2>
            {fileName && <div className="muted small">{fileName}</div>}
          </div>

          {parsed.error ? (
            <div className="notice error" role="alert">
              {parsed.error}
            </div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span className="tag green">{good.length} ready</span>
                {bad.length > 0 && <span className="tag warn">{bad.length} need fixing</span>}
              </div>

              {parsed.unknownColumns.length > 0 && (
                <div className="notice warn">
                  These columns weren&apos;t recognised and will be left out: {parsed.unknownColumns.join(", ")}.
                </div>
              )}

              {bad.length > 0 && (
                <div className="stack" style={{ gap: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    Fix these rows in your sheet and upload again, or add the others without them:
                  </div>
                  <ul className="list" style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {bad.slice(0, 50).map((r) => (
                      <li key={r.line} className="row" style={{ fontSize: 13, alignItems: "flex-start" }}>
                        <span className="tag warn" style={{ flexShrink: 0 }}>
                          Row {r.line}
                        </span>
                        <div className="grow">
                          <div style={{ fontWeight: 600 }}>{r.food.name || "(no name)"}</div>
                          <div style={{ color: "var(--warn-text)" }}>{r.errors.join(". ")}.</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {bad.length > 50 && <div className="muted small">and {bad.length - 50} more rows.</div>}
                </div>
              )}

              {good.length > 0 && (
                <div className="stack" style={{ gap: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Ready to add</div>
                  <ul className="list" style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {good.slice(0, PREVIEW_LIMIT).map((r) => (
                      <li key={r.line} className="row" style={{ display: "block" }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{r.food.name}</div>
                        {(r.food.local_name || r.food.brand) && (
                          <div className="muted" style={{ fontSize: 13 }}>
                            {[r.food.local_name, r.food.brand].filter(Boolean).join(" · ")}
                          </div>
                        )}
                        <div className="muted small">
                          {fmt(r.food.kcal ?? 0)} kcal · {r.food.serving_label || "1 serving"} · P{" "}
                          {fmt(r.food.protein_g ?? 0, 1)} C {fmt(r.food.carbs_g ?? 0, 1)} F {fmt(r.food.fat_g ?? 0, 1)}
                        </div>
                      </li>
                    ))}
                  </ul>
                  {good.length > PREVIEW_LIMIT && (
                    <div className="muted small">and {good.length - PREVIEW_LIMIT} more.</div>
                  )}
                </div>
              )}

              <p className="muted small">
                Foods go live straight away. Any food the library already has with the same name and brand is skipped.
              </p>
              {error && (
                <div className="notice error" role="alert">
                  {error}
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-secondary" style={{ flex: "0 0 auto", width: "auto" }} onClick={reset} disabled={!!saving}>
                  Start over
                </button>
                <button className="btn btn-primary" onClick={save} disabled={good.length === 0 || !!saving}>
                  {saving ? (
                    <>
                      <span className="spinner" /> Adding {saving.done}/{saving.total}…
                    </>
                  ) : good.length === 1 ? (
                    "Add 1 food"
                  ) : (
                    `Add ${good.length} foods`
                  )}
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </>
  );
}
