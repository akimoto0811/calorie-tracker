import { notFound } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { FoodForm } from "@/components/FoodForm";
import { requireUser } from "@/lib/supabase/server";
import { amIAdmin, signedPhotoUrl } from "@/lib/queries";
import { localNow, today } from "@/lib/dates";
import { defaultMeal } from "@/lib/nutrition";
import { NUTRIENT_KEYS, type Food, type FoodDraft } from "@/lib/types";

export default async function EditFood({ params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await requireUser();
  const { id } = await params;
  const [{ data }, admin, todayStr, now] = await Promise.all([
    supabase.from("foods").select("*").eq("id", id).maybeSingle(),
    amIAdmin(supabase),
    today(),
    localNow(),
  ]);
  if (!data) notFound();
  const food = data as Food;
  const mine = food.created_by === user.id;
  if (!mine && !admin) notFound();
  const photoUrl = await signedPhotoUrl(supabase, food.photo_path);

  const initial = {
    name: food.name,
    brand: food.brand ?? "",
    local_name: food.local_name ?? "",
    serving_label: food.serving_label,
    barcode: food.barcode,
    source: food.source,
    label_photo_path: food.label_photo_path,
    photo_path: food.photo_path,
    ...Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, food[k] === null || food[k] === undefined ? null : Number(food[k])])),
  } as FoodDraft;

  return (
    <main className="page no-nav">
      <header className="topbar">
        <BackButton fallback={mine ? "/library?f=mine" : "/library"} />
        <div className="grow">
          <h1 style={{ fontSize: 24 }}>Edit food</h1>
          {!mine && <div className="muted small">Added by a friend. You can edit it as the app owner.</div>}
        </div>
      </header>
      <FoodForm
        initial={initial}
        meal={defaultMeal(now)}
        date={todayStr}
        today={todayStr}
        defaultShare={false}
        edit={{ id: food.id, status: food.status, admin, mine }}
        photoUrl={photoUrl}
      />
    </main>
  );
}
