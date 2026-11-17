"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { foodsByIds, importFoods } from "@/app/actions";
import { matchPhotos, parseFoods, planRow, templateCsv, type ImportFood, type ImportResult } from "@/lib/foodImport";
import type { Food } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { shrink } from "@/lib/image";
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

/** Uploads each photo (shrunk, a few at a time) and returns its storage path per row line. */
async function uploadPhotos(files: Map<number, File>, onProgress: (done: number) => void) {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) throw new Error("Please sign in again.");
  const paths = new Map<number, string>();
  const queue = [...files.entries()];
  let done = 0;
  async function worker() {
    for (let next = queue.shift(); next; next = queue.shift()) {
      const [line, file] = next;
      const blob = await shrink(file, 1200);
      const path = `${uid}/food-${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage
        .from("label-photos")
        .upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (error) throw new Error(`Photo ${file.name} didn't upload: ${error.message}`);
      paths.set(line, path);
      onProgress(++done);
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()]);
  return paths;
}

export function BulkUpload() {
  const [paste, setPaste] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ImportResult | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [saving, setSaving] = useState<{ what: "photos" | "foods"; done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ added: number; updated: number; skipped: string[]; missing: string[] } | null>(
    null,
  );
  // The library's current version of rows that have an ID, to show what will change.
  const [existing, setExisting] = useState<Map<string, Food> | null>(null);

  async function check(text: string, name: string | null) {
    setFileName(name);
    setError(null);
    setDone(null);
    setExisting(null);
    const result = parseFoods(text);
    setParsed(result);
    const ids = result.rows.map((r) => r.food.id).filter(Boolean);
    if (ids.length === 0) return setExisting(new Map());
    try {
      const foods = await foodsByIds(ids);
      setExisting(new Map(foods.map((f) => [f.id, f])));
    } catch {
      setError("Couldn't load the current foods to compare. Check your connection and try again.");
    }
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

  function onPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
    e.target.value = "";
    // Picking again adds to the photos already chosen; a same-named photo replaces the old one.
    setPhotos((old) => [...old.filter((o) => !picked.some((p) => p.name === o.name)), ...picked]);
  }

  function reset() {
    setPhotos([]);
    setParsed(null);
    setFileName(null);
    setPaste("");
    setError(null);
  }

  const valid = useMemo(() => parsed?.rows.filter((r) => r.errors.length === 0) ?? [], [parsed]);
  const { matched, missing } = useMemo(() => matchPhotos(valid, photos), [valid, photos]);
  // What each row will do: new food, change a food, or nothing.
  const plans = useMemo(() => {
    const m = new Map<number, ReturnType<typeof planRow>>();
    if (!parsed || !existing) return m;
    for (const r of valid) {
      m.set(
        r.line,
        planRow(
          r.food,
          existing.get(r.food.id.toLowerCase()) ?? existing.get(r.food.id),
          parsed.columns,
          matched.has(r.line),
        ),
      );
    }
    return m;
  }, [parsed, existing, valid, matched]);
  const good = useMemo(
    () => valid.filter((r) => ["new", "update"].includes(plans.get(r.line)?.kind ?? "")),
    [valid, plans],
  );
  const unchanged = valid.filter((r) => plans.get(r.line)?.kind === "same").length;
  const newCount = good.filter((r) => plans.get(r.line)?.kind === "new").length;
  const updateCount = good.length - newCount;
  const bad = useMemo(() => {
    const gone = valid
      .filter((r) => plans.get(r.line)?.kind === "missing")
      .map((r) => ({ ...r, errors: ["This ID isn't in the library any more. Clear the ID to add it as a new food"] }));
    return [...(parsed?.rows.filter((r) => r.errors.length > 0) ?? []), ...gone].sort((a, b) => a.line - b.line);
  }, [parsed, valid, plans]);
  const thumbs = useMemo(() => {
    const m = new Map<number, string>();
    for (const r of good.slice(0, PREVIEW_LIMIT)) {
      const f = matched.get(r.line);
      if (f) m.set(r.line, URL.createObjectURL(f));
    }
    return m;
  }, [good, matched]);
  useEffect(() => () => thumbs.forEach((u) => URL.revokeObjectURL(u)), [thumbs]);
  const unusedPhotos = photos.length - new Set(matched.values()).size;

  async function save() {
    setError(null);
    let paths = new Map<number, string>();
    if (matched.size > 0) {
      setSaving({ what: "photos", done: 0, total: matched.size });
      try {
        paths = await uploadPhotos(matched, (n) => setSaving({ what: "photos", done: n, total: matched.size }));
      } catch (e) {
        setSaving(null);
        setError((e as Error).message + " Nothing was added yet. Try again.");
        return;
      }
    }
    const foods: ImportFood[] = good.map((r) => ({ ...r.food, photo_path: paths.get(r.line) }));
    setSaving({ what: "foods", done: 0, total: foods.length });
    let added = 0;
    let updated = 0;
    const skipped: string[] = [];
    const gone: string[] = [];
    for (let i = 0; i < foods.length; i += CHUNK) {
      const res = await importFoods(foods.slice(i, i + CHUNK), parsed?.columns ?? []);
      if (!res.ok) {
        setSaving(null);
        setError(
          added + updated > 0
            ? `${added + updated} foods were saved, then this went wrong: ${res.error} Upload the same file again to finish; foods already saved are skipped or unchanged.`
            : res.error,
        );
        return;
      }
      added += res.added;
      updated += res.updated;
      skipped.push(...res.skipped);
      gone.push(...res.missing);
      setSaving({ what: "foods", done: Math.min(i + CHUNK, foods.length), total: foods.length });
    }
    setSaving(null);
    setParsed(null);
    setFileName(null);
    setPaste("");
    setPhotos([]);
    setExisting(null);
    setDone({ added, updated, skipped, missing: gone });
  }

  if (done) {
    return (
      <section className="card">
        <h2 style={{ fontFamily: "var(--font)", fontSize: 18 }}>
          {[
            done.added > 0 || done.updated === 0 ? `${done.added} ${done.added === 1 ? "food" : "foods"} added` : "",
            done.updated > 0 ? `${done.updated} ${done.updated === 1 ? "food" : "foods"} changed` : "",
          ]
            .filter(Boolean)
            .join(", ")}
        </h2>
        <p className="muted small">The changes are live now, so everyone sees them.</p>
        {done.missing.length > 0 && (
          <div className="notice warn">
            {done.missing.length} {done.missing.length === 1 ? "row was" : "rows were"} skipped because their ID
            isn&apos;t in the library any more.
          </div>
        )}
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
          Open it in Google Sheets, Excel or Numbers and add one food per row. Values are for one serving. Only Name and
          Calories are required; leave any other box empty if you don&apos;t know it.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            className="btn btn-secondary"
            style={{ flex: "1 1 160px", height: 44, fontSize: 15 }}
            onClick={() => download("basic")}
          >
            Template
          </button>
          <button
            className="btn btn-secondary"
            style={{ flex: "1 1 160px", height: 44, fontSize: 15 }}
            onClick={() => download("full")}
          >
            With all nutrients
          </button>
        </div>
        <div className="stack" style={{ gap: 6, paddingTop: 4, borderTop: "1px solid var(--line)" }}>
          <div style={{ fontWeight: 700, fontSize: 14, paddingTop: 8 }}>Change foods already in the library</div>
          <p className="muted small">
            Download the library, change what you need in the spreadsheet, then upload it below. Each row has an ID, so
            your changes update that food even if you rename it. Don&apos;t edit the ID. Rows without an ID are added as
            new foods.
          </p>
          <a href="/library/export" className="btn btn-secondary" style={{ height: 44, fontSize: 15 }} download>
            Download library
          </a>
        </div>
        <p className="muted small">
          Keep the first row (the column names) as it is. You can delete columns you don&apos;t need. For a product
          photo, write the photo&apos;s file name in the Photo column (e.g. yogurt.jpg), or name the photo the same as
          the food (e.g. Greek yogurt.jpg) and leave the column empty.
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
            <button
              className="btn btn-secondary"
              style={{ height: 44, fontSize: 15 }}
              onClick={() => check(paste, null)}
            >
              Check pasted rows
            </button>
          )}
        </div>
        <div className="field">
          <span className="label">Product photos (optional)</span>
          <label className="btn btn-secondary" style={{ height: 44, fontSize: 15 }}>
            {photos.length ? "Add more photos" : "Choose photos"}
            <input type="file" accept="image/*" multiple onChange={onPhotos} className="sr-only" />
          </label>
          {photos.length > 0 && (
            <div className="muted small" style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span className="grow">{photos.length === 1 ? "1 photo chosen" : `${photos.length} photos chosen`}</span>
              <button className="link-btn danger" style={{ fontSize: 13 }} onClick={() => setPhotos([])}>
                Clear photos
              </button>
            </div>
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
              {!existing && !error && (
                <div className="muted small" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className="spinner" /> Comparing with the library…
                </div>
              )}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {newCount > 0 && <span className="tag green">{newCount} new</span>}
                {updateCount > 0 && <span className="tag green">{updateCount} to change</span>}
                {unchanged > 0 && <span className="tag">{unchanged} unchanged</span>}
                {bad.length > 0 && <span className="tag warn">{bad.length} need fixing</span>}
                {matched.size > 0 && <span className="tag">{matched.size} with photo</span>}
              </div>

              {(missing.size > 0 || (photos.length > 0 && unusedPhotos > 0)) && (
                <div className="notice warn">
                  <div>
                    {missing.size > 0 &&
                      `${missing.size === 1 ? "1 photo named" : `${missing.size} photos named`} in the sheet ${missing.size === 1 ? "wasn't" : "weren't"} chosen (${[...missing.values()].slice(0, 5).join(", ")}${missing.size > 5 ? ", …" : ""}). Those foods are added without a photo. `}
                    {photos.length > 0 &&
                      unusedPhotos > 0 &&
                      `${unusedPhotos === 1 ? "1 chosen photo doesn't" : `${unusedPhotos} chosen photos don't`} match any food and won't be used.`}
                  </div>
                </div>
              )}

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
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Ready to save</div>
                  <ul className="list" style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {good.slice(0, PREVIEW_LIMIT).map((r) => (
                      <li key={r.line} className="row">
                        {thumbs.get(r.line) && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumbs.get(r.line)} alt="" className="food-thumb" />
                        )}
                        <div className="grow" style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{r.food.name}</div>
                          {(r.food.local_name || r.food.brand) && (
                            <div className="muted" style={{ fontSize: 13 }}>
                              {[r.food.local_name, r.food.brand].filter(Boolean).join(" · ")}
                            </div>
                          )}
                          <div className="muted small">
                            {fmt(r.food.kcal ?? 0)} kcal · {r.food.serving_label || "1 serving"} · P{" "}
                            {fmt(r.food.protein_g ?? 0, 1)} C {fmt(r.food.carbs_g ?? 0, 1)} F{" "}
                            {fmt(r.food.fat_g ?? 0, 1)}
                          </div>
                          {(() => {
                            const p = plans.get(r.line);
                            if (p?.kind === "new")
                              return (
                                <span className="tag green" style={{ marginTop: 4 }}>
                                  New
                                </span>
                              );
                            if (p?.kind !== "update") return null;
                            return (
                              <div style={{ fontSize: 13, marginTop: 2 }}>
                                <span className="tag" style={{ marginRight: 6 }}>
                                  Change
                                </span>
                                {p.changes.slice(0, 4).join(" · ")}
                                {p.changes.length > 4 ? ` · and ${p.changes.length - 4} more` : ""}
                              </div>
                            );
                          })()}
                          {missing.has(r.line) && (
                            <div style={{ fontSize: 13, color: "var(--warn-text)" }}>
                              Photo {missing.get(r.line)} not chosen
                            </div>
                          )}
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
                Changes go live straight away. A new food is skipped if the library already has one with the same name
                and brand. Unchanged rows are left as they are.
              </p>
              {error && (
                <div className="notice error" role="alert">
                  {error}
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn btn-secondary"
                  style={{ flex: "0 0 auto", width: "auto" }}
                  onClick={reset}
                  disabled={!!saving}
                >
                  Start over
                </button>
                <button
                  className="btn btn-primary"
                  onClick={save}
                  disabled={good.length === 0 || !!saving || !existing}
                >
                  {saving ? (
                    <>
                      <span className="spinner" /> {saving.what === "photos" ? "Uploading photos" : "Saving"}{" "}
                      {saving.done}/{saving.total}…
                    </>
                  ) : good.length === 0 ? (
                    "Nothing to save"
                  ) : (
                    `Save ${good.length} ${good.length === 1 ? "food" : "foods"}`
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
