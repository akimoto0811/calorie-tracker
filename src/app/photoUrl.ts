"use server";

import { requireUser } from "@/lib/supabase/server";
import { amIAdmin } from "@/lib/queries";

import { downloadPhoto } from "@/lib/downloadPhoto";

/**
 * Bulk upload: downloads a product photo from a link (owner only), shrinks it,
 * and stores it like a picked photo. Returns the storage path.
 */
export async function photoFromUrl(link: string): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const { supabase, user } = await requireUser();
  if (!(await amIAdmin(supabase))) return { ok: false, error: "Only the app owner can do this." };

  if (process.env.ENABLE_REMOTE_PHOTO_IMPORT !== "true") {
    return { ok: false, error: "imports from links are paused. Upload the photo file instead." };
  }

  let bytes: Buffer;
  try {
    bytes = await downloadPhoto(link);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }

  let jpeg: Buffer;
  try {
    const sharp = (await import("sharp")).default;
    jpeg = await sharp(bytes, { limitInputPixels: 80_000_000 })
      .rotate()
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 82 })
      .toBuffer();
  } catch {
    return { ok: false, error: "isn't a picture the app can read" };
  }

  const path = `${user.id}/food-${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from("label-photos").upload(path, jpeg, { contentType: "image/jpeg", upsert: false });
  if (error) return { ok: false, error: `couldn't be saved (${error.message})` };
  return { ok: true, path };
}
