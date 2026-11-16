import { BackButton } from "@/components/BackButton";
import { NutritionTable } from "@/components/NutritionTable";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { readAddParams, type AddSearchParams } from "@/lib/addParams";
import { amIAdmin, getNames, signedPhotoUrl } from "@/lib/queries";
import type { Food } from "@/lib/types";
import { ChevronLeft } from "@/components/icons";
import { LogExisting } from "./LogExisting";

const SOURCE_LABEL = { manual: "Manual", label: "Label photo", barcode: "Barcode" } as const;

export default async function LogFoodPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: AddSearchParams;
}) {
  const { supabase, user } = await requireUser();
  const { id } = await params;
  const { meal, date, today, qs } = await readAddParams(searchParams);

  const { data } = await supabase.from("foods").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const food = data as Food;
  const [names, photo, foodPhoto, admin] = await Promise.all([
    getNames(supabase, [food.created_by]),
    signedPhotoUrl(supabase, food.label_photo_path),
    signedPhotoUrl(supabase, food.photo_path),
    amIAdmin(supabase),
  ]);
  const by = food.created_by === user.id ? "you" : names[food.created_by] ?? "a friend";

  return (
    <main className="page no-nav">
      <header className="topbar">
        <BackButton fallback={`/add?${qs}`} />
        <h1 style={{ fontSize: 24 }}>Add food</h1>
      </header>

      <article className="card">
        {foodPhoto && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foodPhoto} alt={food.name} className="food-hero" />
        )}
        <div style={{ display: "flex", gap: 14 }}>
          {photo && (
            <a href={photo} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="Nutrition label photo" className="photo-thumb" />
            </a>
          )}
          <div className="stack" style={{ gap: 6 }}>
            <h2 style={{ fontFamily: "var(--font)", fontSize: 19 }}>{food.name}</h2>
            <div className="muted" style={{ fontSize: 14 }}>
              {food.local_name ? `${food.local_name} · ` : ""}
              {food.brand ? `${food.brand} · ` : ""}
              {food.serving_label} serving
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span className="tag">{SOURCE_LABEL[food.source]}</span>
              <span className="tag">by {by}</span>
              {food.status === "pending" && <span className="tag warn">Waiting for review</span>}
              {food.status === "private" && <span className="tag">Only you</span>}
            </div>
            {(food.created_by === user.id || admin) && (
              <Link href={`/library/${food.id}/edit`} className="link-btn" style={{ fontSize: 14, alignSelf: "flex-start" }}>
                Edit food
              </Link>
            )}
          </div>
        </div>
        <NutritionTable values={food} />
      </article>

      <LogExisting foodId={food.id} kcal={Number(food.kcal)} servingLabel={food.serving_label} meal={meal} date={date} today={today} />
    </main>
  );
}
