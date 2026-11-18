"use server";

import { requireUser } from "@/lib/supabase/server";
import { amIAdmin } from "@/lib/queries";

/** Pause server-side fetching until the replacement downloader is deployed. */
export async function photoFromUrl(_link: string): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const { supabase } = await requireUser();
  if (!(await amIAdmin(supabase))) return { ok: false, error: "Only the app owner can do this." };
  return { ok: false, error: "couldn't be downloaded because photo links are paused. Upload the photo file instead." };
}
