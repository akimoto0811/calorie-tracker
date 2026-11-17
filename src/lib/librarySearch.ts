import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getNames, signedPhotoUrls } from "./queries";
import type { Food } from "./types";

export const LIBRARY_FILTERS = [
  { key: "all", label: "All" },
  { key: "mine", label: "Added by me" },
  { key: "barcode", label: "Barcode" },
] as const;
export type LibraryFilter = (typeof LIBRARY_FILTERS)[number]["key"];

export interface LibraryData {
  q: string;
  filter: LibraryFilter;
  /** False when nothing is listed yet: the shared library only shows once you search. */
  browse: boolean;
  foods: Food[];
  names: Record<string, string>;
  photos: Record<string, string>;
  /** Number of foods in the library, shown before you search. */
  total: number | null;
}

export function cleanFilter(f: unknown): LibraryFilter {
  return LIBRARY_FILTERS.some((x) => x.key === f) ? (f as LibraryFilter) : "all";
}

const term = (q: string) => `*${q.replace(/[%_*,().:"\\]/g, " ").trim()}*`;

export async function loadLibrary(
  supabase: SupabaseClient,
  userId: string,
  rawQ: string,
  filter: LibraryFilter,
): Promise<LibraryData> {
  const q = rawQ.trim().slice(0, 100);
  const browse = filter === "mine" || q !== "";
  if (!browse) {
    const { count } = await supabase.from("foods").select("id", { count: "exact", head: true }).eq("status", "approved");
    return { q, filter, browse, foods: [], names: {}, photos: {}, total: count ?? null };
  }
  let query = supabase.from("foods").select("*").order("name").limit(100);
  query = filter === "mine" ? query.eq("created_by", userId) : query.eq("status", "approved");
  if (filter === "barcode") query = query.not("barcode", "is", null);
  if (q) {
    const t = term(q);
    query = query.or(`name.ilike.${t},local_name.ilike.${t},brand.ilike.${t},barcode.ilike.${t}`);
  }
  const { data } = await query;
  const foods = (data ?? []) as Food[];
  const [names, photos] = await Promise.all([
    getNames(supabase, foods.map((f) => f.created_by)),
    signedPhotoUrls(supabase, foods.map((f) => f.photo_path)),
  ]);
  return { q, filter, browse, foods, names, photos, total: null };
}

export type AddResult = Pick<Food, "id" | "name" | "local_name" | "brand" | "kcal" | "serving_label">;

/** Foods you can log from the Add food search: approved ones plus your own. */
export async function searchToLog(supabase: SupabaseClient, userId: string, rawQ: string): Promise<AddResult[]> {
  const q = rawQ.trim().slice(0, 100);
  if (!q) return [];
  const t = term(q);
  const { data } = await supabase
    .from("foods")
    .select("id, name, local_name, brand, kcal, serving_label")
    .or(`status.eq.approved,created_by.eq.${userId}`)
    .neq("status", "rejected")
    .or(`name.ilike.${t},local_name.ilike.${t},brand.ilike.${t},barcode.ilike.${t}`)
    .order("name")
    .limit(25);
  return (data ?? []) as AddResult[];
}
