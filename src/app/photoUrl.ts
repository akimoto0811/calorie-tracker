"use server";

import { requireUser } from "@/lib/supabase/server";
import { amIAdmin } from "@/lib/queries";

const MAX_BYTES = 15 * 1024 * 1024;

/** Hosts a link must never point at: this machine and private networks. */
function blockedHost(host: string) {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (h.includes(":")) return h === "::1" || /^(fc|fd|fe80|::ffff:)/.test(h);
  const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

/**
 * Bulk upload: downloads a product photo from a link (owner only), shrinks it,
 * and stores it like a picked photo. Returns the storage path.
 */
export async function photoFromUrl(link: string): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const { supabase, user } = await requireUser();
  if (!(await amIAdmin(supabase))) return { ok: false, error: "Only the app owner can do this." };

  let url: URL;
  try {
    url = new URL(link.trim());
  } catch {
    return { ok: false, error: "isn't a web link" };
  }
  if (!["http:", "https:"].includes(url.protocol) || blockedHost(url.hostname)) {
    return { ok: false, error: "isn't a public web link" };
  }

  let bytes: Buffer;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; FoodLibraryImport/1.0)", Accept: "image/*" },
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, error: `the site answered ${res.status}` };
    const type = res.headers.get("content-type") ?? "";
    if (type && !type.startsWith("image/") && !type.startsWith("application/octet-stream")) {
      return { ok: false, error: "goes to a web page, not a picture. Right-click the picture and copy the image address" };
    }
    if (Number(res.headers.get("content-length") ?? 0) > MAX_BYTES) return { ok: false, error: "picture is over 15 MB" };
    bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length > MAX_BYTES) return { ok: false, error: "picture is over 15 MB" };
  } catch (e) {
    return { ok: false, error: (e as Error).name === "TimeoutError" ? "took too long to download" : "couldn't be downloaded" };
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
