import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "./types";

export const DEFAULT_GOALS: Omit<Profile, "id" | "display_name"> = {
  goal_mode: "maintain",
  kcal_goal: 2000,
  protein_goal: 120,
  carbs_goal: 220,
  fat_goal: 70,
  water_goal_ml: 2000,
  sex: null,
  birth_year: null,
  height_cm: null,
  weight_kg: null,
  activity: null,
};

export async function getMyProfile(supabase: SupabaseClient, userId: string): Promise<Profile> {
  const { data } = await supabase.rpc("my_profile");
  const row = Array.isArray(data) ? data[0] : data;
  return (row as Profile) ?? { id: userId, display_name: "", ...DEFAULT_GOALS };
}

/** Number of shared foods waiting for someone other than me to review. */
export async function getReviewCount(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count } = await supabase
    .from("foods")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
    .neq("created_by", userId);
  return count ?? 0;
}

/** Map of user id → display name, for "by Sam" tags. */
export async function getNames(
  supabase: SupabaseClient,
  ids: string[],
): Promise<Record<string, string>> {
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) return {};
  const { data } = await supabase.from("profiles").select("id, display_name").in("id", unique);
  return Object.fromEntries((data ?? []).map((r) => [r.id, r.display_name || "a friend"]));
}

export async function signedPhotoUrl(
  supabase: SupabaseClient,
  path: string | null,
): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from("label-photos").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}
