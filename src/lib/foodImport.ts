import { FORM_NUTRIENTS, NUTRIENTS, NUTRIENT_KEYS, type NutrientKey } from "./types";

/** The text columns of the bulk upload sheet, before the nutrients. */
const TEXT_COLUMNS = [
  { key: "name", header: "Name", aliases: ["food", "food name", "english name"] },
  { key: "local_name", header: "Local name", aliases: ["original name", "name in original language"] },
  { key: "brand", header: "Brand", aliases: [] },
  { key: "serving_label", header: "Serving", aliases: ["serving size", "serving label", "portion"] },
  { key: "barcode", header: "Barcode", aliases: ["ean", "upc"] },
] as const;
type TextKey = (typeof TEXT_COLUMNS)[number]["key"];
type ColumnKey = TextKey | NutrientKey;

export const MAX_IMPORT_ROWS = 2000;

export type ImportFood = {
  name: string;
  local_name: string;
  brand: string;
  serving_label: string;
  barcode: string;
} & Partial<Record<NutrientKey, number>>;

export interface ImportRow {
  /** Row number as the spreadsheet shows it (the header is row 1). */
  line: number;
  food: ImportFood;
  errors: string[];
}

export interface ImportResult {
  rows: ImportRow[];
  /** Column headers we didn't recognise; those columns are left out. */
  unknownColumns: string[];
  /** A problem with the whole file, e.g. no Name column. */
  error?: string;
}

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
  const headers = [...TEXT_COLUMNS.map((c) => c.header), ...keys.map(headerFor)];
  return headers.map(csvCell).join(",") + "\r\n";
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
  if (table.length === 0) return { rows: [], unknownColumns: [], error: "The file is empty." };

  const header = table[0];
  const columns: (ColumnKey | null)[] = header.map((h) => HEADER_MAP.get(norm(h)) ?? null);
  const unknownColumns = header.filter((h, i) => h.trim() && columns[i] === null).map((h) => h.trim());
  if (!columns.includes("name")) {
    return {
      rows: [],
      unknownColumns,
      error: "Couldn't find a “Name” column. Keep the first row of the template as it is.",
    };
  }
  if (!columns.includes("kcal")) {
    return {
      rows: [],
      unknownColumns,
      error: "Couldn't find a “Calories (kcal)” column. Keep the first row of the template as it is.",
    };
  }
  const body = table.slice(1);
  if (body.length > MAX_IMPORT_ROWS) {
    return {
      rows: [],
      unknownColumns,
      error: `That's ${body.length} foods. Upload up to ${MAX_IMPORT_ROWS} at a time by splitting the file.`,
    };
  }

  const rows: ImportRow[] = [];
  const seen = new Map<string, number>();
  table.forEach((cells, idx) => {
    if (idx === 0) return;
    const food: ImportFood = { name: "", local_name: "", brand: "", serving_label: "", barcode: "" };
    const errors: string[] = [];
    columns.forEach((key, i) => {
      if (!key) return;
      const raw = (cells[i] ?? "").trim();
      if (key === "name" || key === "local_name" || key === "brand" || key === "serving_label" || key === "barcode") {
        food[key] = raw;
        return;
      }
      const n = parseNumber(raw);
      if (n === null) return;
      if (Number.isNaN(n)) errors.push(`${headerFor(key)} “${raw}” isn't a number`);
      else if (n < 0) errors.push(`${headerFor(key)} can't be below 0`);
      else food[key] = n;
    });

    if (!food.name) errors.unshift("Name is missing");
    else if (food.name.length > 200) errors.push("Name is longer than 200 letters");
    if (food.kcal === undefined && !errors.some((e) => e.startsWith("Calories"))) errors.push("Calories is missing");
    else if ((food.kcal ?? 0) > 5000) errors.push("Calories is over 5000. Is that for one serving?");
    const code = food.barcode.replace(/\D/g, "");
    if (food.barcode && !/^\d{6,14}$/.test(code)) errors.push("Barcode should be 6 to 14 digits");
    food.barcode = code;

    const dupKey = `${food.name.toLowerCase()}|${food.brand.toLowerCase()}`;
    if (food.name && seen.has(dupKey)) errors.push(`Same name and brand as row ${seen.get(dupKey)}`);
    else if (food.name) seen.set(dupKey, nonEmpty[idx].line);

    rows.push({ line: nonEmpty[idx].line, food, errors });
  });
  return { rows, unknownColumns };
}
