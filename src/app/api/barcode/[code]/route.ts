import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { emptyDraft, type FoodDraft } from "@/lib/types";

/**
 * Looks up a barcode. First checks our own library (approved foods, or your own),
 * then Open Food Facts (https://world.openfoodfacts.org, free, no key needed).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { code } = await params;
  if (!/^\d{6,14}$/.test(code)) return NextResponse.json({ error: "Invalid barcode" }, { status: 400 });

  const { data: existing } = await supabase
    .from("foods")
    .select("id")
    .eq("barcode", code)
    .or(`status.eq.approved,created_by.eq.${user.id}`)
    .neq("status", "rejected")
    .order("status", { ascending: true })
    .limit(1);
  if (existing && existing.length > 0) {
    return NextResponse.json({ kind: "library", foodId: existing[0].id });
  }

  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,brands,serving_size,serving_quantity,nutriments`,
      {
        headers: { "User-Agent": "CalorieTracker/0.1 (personal hobby app)" },
        next: { revalidate: 60 * 60 * 24 },
      },
    );
    if (!res.ok) return NextResponse.json({ kind: "unknown", barcode: code });
    const body = await res.json();
    if (body.status !== 1 || !body.product) return NextResponse.json({ kind: "unknown", barcode: code });
    return NextResponse.json({ kind: "off", draft: fromOpenFoodFacts(code, body.product) });
  } catch {
    return NextResponse.json({ kind: "unknown", barcode: code });
  }
}

type OffProduct = {
  product_name?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  nutriments?: Record<string, number | string | undefined>;
};

function fromOpenFoodFacts(code: string, p: OffProduct): FoodDraft & { per: "serving" | "100g" } {
  const n = p.nutriments ?? {};
  const raw = (key: string): number | null => {
    const v = n[key];
    const x = typeof v === "string" ? Number(v) : v;
    return typeof x === "number" && Number.isFinite(x) && x >= 0 ? x : null;
  };
  const get = (key: string): number | null => {
    const x = raw(key);
    return x === null ? null : Math.round(x * 10) / 10;
  };
  // Open Food Facts stores everything in grams; labels show these in milligrams.
  const mg = (key: string): number | null => {
    const x = raw(key);
    return x === null ? null : Math.round(x * 10000) / 10;
  };
  const hasServing = get("energy-kcal_serving") !== null || get("proteins_serving") !== null;
  const suffix = hasServing ? "_serving" : "_100g";
  const kcal =
    get(`energy-kcal${suffix}`) ??
    (get(`energy-kj${suffix}`) !== null ? Math.round(get(`energy-kj${suffix}`)! / 4.184) : null) ??
    (get(`energy${suffix}`) !== null ? Math.round(get(`energy${suffix}`)! / 4.184) : null);

  return {
    ...emptyDraft("barcode"),
    name: (p.product_name ?? "").trim(),
    brand: (p.brands ?? "").split(",")[0].trim(),
    serving_label: hasServing ? (p.serving_size || "1 serving") : "100 g",
    barcode: code,
    kcal: kcal ?? 0,
    protein_g: get(`proteins${suffix}`) ?? 0,
    carbs_g: get(`carbohydrates${suffix}`) ?? 0,
    fat_g: get(`fat${suffix}`) ?? 0,
    sat_fat_g: get(`saturated-fat${suffix}`),
    trans_fat_g: get(`trans-fat${suffix}`),
    cholesterol_mg: mg(`cholesterol${suffix}`),
    sodium_mg: mg(`sodium${suffix}`) ?? (raw(`salt${suffix}`) !== null ? Math.round(raw(`salt${suffix}`)! * 400) : null),
    fiber_g: get(`fiber${suffix}`),
    sugar_g: get(`sugars${suffix}`),
    added_sugar_g: get(`added-sugars${suffix}`),
    vitamin_d_mcg: raw(`vitamin-d${suffix}`) !== null ? Math.round(raw(`vitamin-d${suffix}`)! * 1e7) / 10 : null,
    calcium_mg: mg(`calcium${suffix}`),
    iron_mg: mg(`iron${suffix}`),
    potassium_mg: mg(`potassium${suffix}`),
    per: hasServing ? "serving" : "100g",
  };
}
