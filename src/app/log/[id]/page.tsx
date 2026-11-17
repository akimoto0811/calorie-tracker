import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { signedPhotoUrl } from "@/lib/queries";
import { formatLong, today } from "@/lib/dates";
import { eatenText, fmt, splitBrand } from "@/lib/nutrition";
import { MEAL_LABEL, type Food, type LogEntry } from "@/lib/types";
import { BackButton } from "@/components/BackButton";
import { NutritionTable } from "@/components/NutritionTable";
import { EditLog } from "./EditLog";

export default async function LogEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireUser();
  const { id } = await params;
  const { data } = await supabase.from("food_logs").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const log = data as LogEntry;
  const servings = Number(log.servings) || 1;

  const { data: foodData } = log.food_id
    ? await supabase.from("foods").select("id, local_name, photo_path, status").eq("id", log.food_id).maybeSingle()
    : { data: null };
  const food = foodData as Pick<Food, "id" | "local_name" | "photo_path" | "status"> | null;
  const photo = food ? await signedPhotoUrl(supabase, food.photo_path) : null;

  const todayStr = await today();
  const dayHref = log.logged_on === todayStr ? "/" : `/?date=${log.logged_on}`;
  const { name, brand } = splitBrand(log.name);

  return (
    <main className="page no-nav">
      <header className="topbar">
        <BackButton fallback={dayHref} />
        <h1 style={{ fontSize: 24 }}>Food details</h1>
      </header>

      <article className="card">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={name} className="food-hero" />
        )}
        <div className="stack" style={{ gap: 6 }}>
          <h2 style={{ fontFamily: "var(--font)", fontSize: 19 }}>{name}</h2>
          <div className="muted" style={{ fontSize: 14 }}>
            {food?.local_name ? `${food.local_name} · ` : ""}
            {brand ? `${brand} · ` : ""}
            {log.serving_label} serving
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span className="tag">{MEAL_LABEL[log.meal]}</span>
            <span className="tag">{formatLong(log.logged_on)}</span>
          </div>
        </div>
        <div className="between" style={{ alignItems: "baseline", borderTop: "1px solid var(--line)", paddingTop: 12 }}>
          <span style={{ fontWeight: 700 }}>
            You had {eatenText(log.serving_label, servings)}
          </span>
          <span className="muted small">{servings === 1 ? "1 serving" : `${fmt(servings, 2)} servings`}</span>
        </div>
        <NutritionTable values={log} />
        {food && food.status !== "private" && (
          <Link href={`/add/food/${food.id}?meal=${log.meal}&date=${log.logged_on}`} className="link-btn" style={{ fontSize: 14, alignSelf: "flex-start" }}>
            Open in library
          </Link>
        )}
      </article>

      <EditLog
        id={log.id}
        meal={log.meal}
        servings={servings}
        kcalPerServing={Number(log.kcal) / servings}
        servingLabel={log.serving_label}
        backHref={dayHref}
      />
    </main>
  );
}
