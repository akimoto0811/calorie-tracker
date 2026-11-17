"use server";

import { requireUser } from "@/lib/supabase/server";
import { cleanFilter, loadLibrary, searchToLog } from "@/lib/librarySearch";

/** Library results for the search box, fetched without reloading the page. */
export async function searchLibrary(input: { q: string; filter: string }) {
  const { supabase, user } = await requireUser();
  return loadLibrary(supabase, user.id, String(input.q ?? ""), cleanFilter(input.filter));
}

/** Add food search results, fetched without reloading the page. */
export async function searchFoodsToLog(q: string) {
  const { supabase, user } = await requireUser();
  return searchToLog(supabase, user.id, String(q ?? ""));
}
