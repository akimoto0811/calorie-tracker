import { BackButton } from "@/components/BackButton";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { readAddParams, type AddSearchParams } from "@/lib/addParams";
import { getNames, signedPhotoUrl } from "@/lib/queries";
import { fmt } from "@/lib/nutrition";
import { EXTRA_NUTRIENTS, NUTRIENT_LABEL, type Food } from "@/lib/types";
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
  const [names, photo] = await Promise.all([
    getNames(supabase, [food.created_by]),
    signedPhotoUrl(supabase, food.label_photo_path),
  ]);
  const by = food.created_by === user.id ? "you" : names[food.created_by] ?? "a friend";

  return (
    <main className="page no-nav">
      <header className="topbar">
        <BackButton fallback={`/add?${qs}`} />
        <h1 style={{ fontSize: 24 }}>Add food</h1>
      </header>

      <article className="card">
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
              {food.brand ? `${food.brand} · ` : ""}
              {food.serving_label} serving
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span className="tag">{SOURCE_LABEL[food.source]}</span>
              <span className="tag">by {by}</span>
              {food.status === "pending" && <span className="tag warn">Waiting for review</span>}
              {food.status === "private" && <span className="tag">Only you</span>}
            </div>
          </div>
        </div>
        <div>
          <div className="nrow"><span>Calories</span><b>{fmt(food.kcal)} kcal</b></div>
          <div className="nrow"><span>Protein</span><b>{fmt(food.protein_g, 1)} g</b></div>
          <div className="nrow"><span>Carbs</span><b>{fmt(food.carbs_g, 1)} g</b></div>
          <div className="nrow"><span>Fat</span><b>{fmt(food.fat_g, 1)} g</b></div>
          {EXTRA_NUTRIENTS.filter((k) => food[k] !== null).map((k) => (
            <div key={k} className="nrow">
              <span>{NUTRIENT_LABEL[k].replace(" (g)", "")}</span>
              <b>{fmt(food[k], 1)} g</b>
            </div>
          ))}
        </div>
      </article>

      <LogExisting foodId={food.id} kcal={Number(food.kcal)} servingLabel={food.serving_label} meal={meal} date={date} today={today} />
    </main>
  );
}
