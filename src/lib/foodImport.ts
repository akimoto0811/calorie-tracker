import { FORM_NUTRIENTS, NUTRIENTS, NUTRIENT_KEYS, type NutrientKey } from "./types";

/** The text columns of the bulk upload sheet, before the nutrients. */
const TEXT_COLUMNS = [
  { key: "id", header: "ID", aliases: ["food id"] },
  { key: "name", header: "Name", aliases: ["food", "food name", "english name"] },
  { key: "local_name", header: "Local name", aliases: ["original name", "name in original language"] },
  { key: "brand", header: "Brand", aliases: [] },
  { key: "serving_label", header: "Serving", aliases: ["serving size", "serving label", "portion"] },
  { key: "barcode", header: "Barcode", aliases: ["ean", "upc"] },
  { key: "photo", header: "Photo", aliases: ["photo file", "image", "picture", "photo name", "image file"] },
] as const;
type TextKey = (typeof TEXT_COLUMNS)[number]["key"];
type ColumnKey = TextKey | NutrientKey;

export const MAX_IMPORT_ROWS = 2000;

export type ImportFood = {
  /** Set when the row came from "Download library": the row then updates that food. */
  id: string;
  name: string;
  local_name: string;
  brand: string;
  serving_label: string;
  barcode: string;
  /** File name of the product photo, matched to the photos picked on the page. */
  photo: string;
  /** Set after the photo is uploaded. */
  photo_path?: string;
  /** A nutrient column that's in the sheet but empty is null (it clears the value on an update). */
} & Partial<Record<NutrientKey, number | null>>;

export interface ImportRow {
  /** Row number as the spreadsheet shows it (the header is row 1). */
  line: number;
  food: ImportFood;
  errors: string[];
}

export interface ImportResult {
  rows: ImportRow[];
  /** The columns the sheet has (e.g. "name", "kcal"). */
  columns: string[];
  /** Column headers we didn't recognise; those columns are left out. */
  unknownColumns: string[];
  /** A problem with the whole file, e.g. no Name column. */
  error?: string;
}

const TEXT_KEYS = new Set<string>(TEXT_COLUMNS.map((c) => c.key));
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Every way a header can be written, mapped to its column. "Sodium (mg)", "Sodium", "sodium_mg" all work. */
const HEADER_MAP = (() => {
  const m = new Map<string, ColumnKey>();
  for (const c of TEXT_COLUMNS) for (const h of [c.header, c.key, ...c.aliases]) m.set(norm(h), c.key);
  for (const n of NUTRIENTS) {
    for (const h of [n.key, n.name, `${n.name} (${n.unit})`, n.name.replace(/fibre/i, "fiber")]) {
      if (!m.has(norm(h))) m.set(norm(h), n.key);
    }
  }
  m.set(norm("Energy"), "kcal");
  m.set(norm("Energy (kcal)"), "kcal");
  m.set(norm("Carbohydrates"), "carbs_g");
  m.set(norm("Carbs"), "carbs_g");
  m.set(norm("Fat"), "fat_g");
  m.set(norm("Sugar"), "sugar_g");
  m.set(norm("Fiber"), "fiber_g");
  m.set(norm("Fibre"), "fiber_g");
  return m;
})();

function headerFor(key: NutrientKey) {
  const n = NUTRIENTS.find((x) => x.key === key)!;
  return `${n.name} (${n.unit})`;
}

/** A CSV with just the header row, ready to fill in. "basic" has the standard label lines; "full" has every nutrient. */
export function templateCsv(kind: "basic" | "full"): string {
  const keys = kind === "basic" ? FORM_NUTRIENTS : NUTRIENT_KEYS;
  const headers = [...TEXT_COLUMNS.filter((c) => c.key !== "id").map((c) => c.header), ...keys.map(headerFor)];
  return headers.map(csvCell).join(",") + "\r\n";
}

type ExportFood = {
  id: string;
  name: string;
  local_name: string | null;
  brand: string | null;
  serving_label: string;
  barcode: string | null;
} & Partial<Record<NutrientKey, number | string | null>>;

/**
 * The whole library as a CSV to edit and upload again. Each row keeps its food's ID,
 * so uploading it changes that food instead of adding a new one.
 */
export function libraryCsv(foods: ExportFood[]): string {
  const headers = [...TEXT_COLUMNS.map((c) => c.header), ...NUTRIENT_KEYS.map(headerFor)];
  const lines = [headers.map(csvCell).join(",")];
  for (const f of foods) {
    const cells = [
      f.id,
      f.name,
      f.local_name ?? "",
      f.brand ?? "",
      f.serving_label,
      f.barcode ?? "",
      "", // Photo: leave empty to keep the current photo
      ...NUTRIENT_KEYS.map((k) => (f[k] === null || f[k] === undefined ? "" : String(Number(f[k])))),
    ];
    lines.push(cells.map((c) => csvCell(String(c))).join(","));
  }
  return lines.join("\r\n") + "\r\n";
}

function csvCell(s: string) {
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Splits CSV (or tab-separated text pasted from a spreadsheet) into rows of cells. Handles quoted cells. */
export function parseTable(text: string): string[][] {
  text = text.replace(/^﻿/, "");
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const count = (ch: string) => firstLine.split(ch).length - 1;
  const delim = count("\t") > 0 ? "\t" : count(";") > count(",") ? ";" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"' && cell === "") {
      quoted = true;
    } else if (ch === delim) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** "12", "12.5", "12,5", "12 g", "<1" → number. Empty → null. Anything else → NaN. */
function parseNumber(raw: string): number | null {
  let s = raw.trim();
  if (!s || s === "-" || s === "–") return null;
  s = s.replace(/^[<~≈]\s*/, "").replace(/\s*(kcal|cal|mcg|µg|ug|mg|g)$/i, "");
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, "");
  else if (/^\d+,\d+$/.test(s)) s = s.replace(",", ".");
  const n = Number(s);
  return s !== "" && Number.isFinite(n) ? n : NaN;
}

/** Reads the uploaded sheet and checks every row. Nothing is saved here. */
export function parseFoods(text: string): ImportResult {
  const all = parseTable(text).map((cells, i) => ({ cells, line: i + 1 }));
  const nonEmpty = all.filter((r) => r.cells.some((c) => c.trim() !== ""));
  const table = nonEmpty.map((r) => r.cells);
  if (table.length === 0) return { rows: [], columns: [], unknownColumns: [], error: "The file is empty." };

  const header = table[0];
  const columns: (ColumnKey | null)[] = header.map((h) => HEADER_MAP.get(norm(h)) ?? null);
  const unknownColumns = header.filter((h, i) => h.trim() && columns[i] === null).map((h) => h.trim());
  if (!columns.includes("name")) {
    return {
      rows: [],
      columns: [],
      unknownColumns,
      error: "Couldn't find a “Name” column. Keep the first row of the template as it is.",
    };
  }
  if (!columns.includes("kcal")) {
    return {
      rows: [],
      columns: [],
      unknownColumns,
      error: "Couldn't find a “Calories (kcal)” column. Keep the first row of the template as it is.",
    };
  }
  const body = table.slice(1);
  if (body.length > MAX_IMPORT_ROWS) {
    return {
      rows: [],
      columns: [],
      unknownColumns,
      error: `That's ${body.length} foods. Upload up to ${MAX_IMPORT_ROWS} at a time by splitting the file.`,
    };
  }

  const rows: ImportRow[] = [];
  const seen = new Map<string, number>();
  table.forEach((cells, idx) => {
    if (idx === 0) return;
    const food: ImportFood = { id: "", name: "", local_name: "", brand: "", serving_label: "", barcode: "", photo: "" };
    const errors: string[] = [];
    columns.forEach((key, i) => {
      if (!key) return;
      const raw = (cells[i] ?? "").trim();
      if (TEXT_KEYS.has(key)) {
        food[key as TextKey] = raw;
        return;
      }
      const nk = key as NutrientKey;
      const n = parseNumber(raw);
      if (n === null) {
        food[nk] = null;
        return;
      }
      if (Number.isNaN(n)) errors.push(`${headerFor(nk)} “${raw}” isn't a number`);
      else if (n < 0) errors.push(`${headerFor(nk)} can't be below 0`);
      else food[nk] = n;
    });

    if (!food.name) errors.unshift("Name is missing");
    else if (food.name.length > 200) errors.push("Name is longer than 200 letters");
    if (food.id && !UUID_RE.test(food.id))
      errors.push("ID was changed. Copy it back from the downloaded file, or clear it to add a new food");
    if ((food.kcal === undefined || food.kcal === null) && !errors.some((e) => e.startsWith("Calories")))
      errors.push("Calories is missing");
    else if ((food.kcal ?? 0) > 5000) errors.push("Calories is over 5000. Is that for one serving?");
    const code = food.barcode.replace(/\D/g, "");
    if (food.barcode && !/^\d{6,14}$/.test(code)) errors.push("Barcode should be 6 to 14 digits");
    food.barcode = code;

    // Two rows for the same food: the same ID, or (for new foods) the same name and brand.
    const dupKey = food.id ? `id:${food.id.toLowerCase()}` : `${food.name.toLowerCase()}|${food.brand.toLowerCase()}`;
    if ((food.id || food.name) && seen.has(dupKey)) {
      errors.push(food.id ? `Same ID as row ${seen.get(dupKey)}` : `Same name and brand as row ${seen.get(dupKey)}`);
    } else if (food.id || food.name) seen.set(dupKey, nonEmpty[idx].line);

    rows.push({ line: nonEmpty[idx].line, food, errors });
  });
  return { rows, columns: columns.filter((c): c is ColumnKey => c !== null), unknownColumns };
}

/** "Greek Yogurt.JPG", "greek-yogurt.jpeg" and "greek_yogurt" all become "greekyogurt". */
export function photoKey(fileName: string) {
  return norm(fileName.replace(/\.[a-z0-9]{2,5}$/i, ""));
}

/** A Photo cell that is a web link rather than a file name. */
export function isPhotoUrl(v: string) {
  return /^https?:\/\/\S+$/i.test(v.trim());
}

/**
 * Finds each row's photo: a web link in the Photo column, or one of the picked files
 * (named in the Photo column, otherwise a file named like the food, e.g. "Greek yogurt.jpg").
 * Returns the file or link per row line, and the photo names in the sheet that weren't picked.
 */
export function matchPhotos(rows: ImportRow[], files: File[]) {
  const byKey = new Map(files.map((f) => [photoKey(f.name), f]));
  const matched = new Map<number, File>();
  const links = new Map<number, string>();
  const missing = new Map<number, string>();
  for (const r of rows) {
    const wanted = r.food.photo.trim();
    if (isPhotoUrl(wanted)) {
      links.set(r.line, wanted);
      continue;
    }
    const file = wanted ? byKey.get(photoKey(wanted)) : byKey.get(photoKey(r.food.name));
    if (file) matched.set(r.line, file);
    else if (wanted) missing.set(r.line, wanted);
  }
  return { matched, links, missing };
}

const FIELD_LABEL: Record<string, string> = {
  name: "Name",
  local_name: "Local name",
  brand: "Brand",
  serving_label: "Serving",
  barcode: "Barcode",
};

type Existing = {
  name: string;
  local_name: string | null;
  brand: string | null;
  serving_label: string;
  barcode: string | null;
} & Partial<Record<NutrientKey, number | string | null>>;

/**
 * What uploading a row will do: add a new food, change one (and what changes), or nothing.
 * Only the sheet's columns count; anything not in the sheet stays as it is.
 */
export function planRow(
  food: ImportFood,
  existing: Existing | undefined,
  columns: string[],
  hasNewPhoto: boolean,
): { kind: "new" } | { kind: "missing" } | { kind: "update" | "same"; changes: string[] } {
  if (!food.id) return { kind: "new" };
  if (!existing) return { kind: "missing" };
  const has = new Set(columns);
  const changes: string[] = [];
  for (const k of ["name", "local_name", "brand", "serving_label", "barcode"] as const) {
    if (!has.has(k)) continue;
    const now = (existing[k] ?? "").trim();
    const next = food[k].trim();
    if (k === "name" && !next) continue;
    if (k === "serving_label" && !next) continue;
    if (now !== next) changes.push(`${FIELD_LABEL[k]}: ${now || "–"} → ${next || "–"}`);
  }
  for (const k of NUTRIENT_KEYS) {
    if (!has.has(k)) continue;
    const core = k === "kcal" || k === "protein_g" || k === "carbs_g" || k === "fat_g";
    const raw = existing[k];
    const now = raw === null || raw === undefined ? null : Number(raw);
    const v = food[k];
    const next = v === null || v === undefined ? (core ? 0 : null) : v;
    if (now !== next) changes.push(`${headerFor(k)}: ${now ?? "–"} → ${next ?? "–"}`);
  }
  if (hasNewPhoto) changes.push("New photo");
  return { kind: changes.length ? "update" : "same", changes };
}
