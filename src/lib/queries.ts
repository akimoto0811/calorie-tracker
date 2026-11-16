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

/** True for the app owner, who can approve any shared food, including their own. */
export async function amIAdmin(supabase: SupabaseClient): Promise<boolean> {
  const { data } = await supabase.rpc("my_profile");
  const row = Array.isArray(data) ? data[0] : data;
  return !!(row as Profile | null)?.is_admin;
}

/** Number of shared foods waiting for me to review (others' foods; every food for the owner). */
export async function getReviewCount(supabase: SupabaseClient, userId: string): Promise<number> {
  let query = supabase.from("foods").select("id", { count: "exact", head: true }).eq("status", "pending");
  if (!(await amIAdmin(supabase))) query = query.neq("created_by", userId);
  const { count } = await query;
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

/** Signed URLs for many photos at once: path → URL. */
export async function signedPhotoUrls(
  supabase: SupabaseClient,
  paths: (string | null | undefined)[],
): Promise<Record<string, string>> {
  const unique = [...new Set(paths)].filter((p): p is string => !!p);
  if (unique.length === 0) return {};
  const { data } = await supabase.storage.from("label-photos").createSignedUrls(unique, 60 * 60);
  return Object.fromEntries((data ?? []).filter((d) => d.signedUrl && d.path).map((d) => [d.path!, d.signedUrl as string]));
}
