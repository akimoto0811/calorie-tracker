import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { NUTRIENTS, emptyDraft, type FoodDraft, type NutrientKey } from "@/lib/types";

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
  // Small amounts keep two decimals (e.g. 0.45 mg copper), the rest one.
  const tidy = (x: number) => (x < 1 ? Math.round(x * 100) / 100 : Math.round(x * 10) / 10);
  const hasServing = raw("energy-kcal_serving") !== null || raw("proteins_serving") !== null;
  const suffix = hasServing ? "_serving" : "_100g";
  const kj = raw(`energy-kj${suffix}`) ?? raw(`energy${suffix}`);
  const kcal = raw(`energy-kcal${suffix}`) ?? (kj !== null ? kj / 4.184 : null);

  // Open Food Facts stores every nutrient in grams; convert to the unit we show.
  const toUnit = { g: 1, mg: 1000, mcg: 1_000_000, kcal: 1 } as const;
  const values = Object.fromEntries(
    NUTRIENTS.filter((x) => "off" in x).map((x) => {
      const v = raw(`${(x as { off: string }).off}${suffix}`);
      return [x.key, v === null ? null : tidy(v * toUnit[x.unit])];
    }),
  ) as Partial<Record<NutrientKey, number | null>>;
  // Many products only list salt: sodium = salt ÷ 2.5.
  const salt = raw(`salt${suffix}`);
  if (values.sodium_mg == null && salt !== null) values.sodium_mg = Math.round(salt * 400);

  return {
    ...emptyDraft("barcode"),
    ...values,
    name: (p.product_name ?? "").trim(),
    brand: (p.brands ?? "").split(",")[0].trim(),
    serving_label: hasServing ? (p.serving_size || "1 serving") : "100 g",
    barcode: code,
    kcal: kcal === null ? 0 : Math.round(kcal),
    protein_g: values.protein_g ?? 0,
    carbs_g: values.carbs_g ?? 0,
    fat_g: values.fat_g ?? 0,
    per: hasServing ? "serving" : "100g",
  };
}
