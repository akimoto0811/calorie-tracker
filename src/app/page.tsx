import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { getMyProfile, getReviewCount } from "@/lib/queries";
import { addDays, DATE_RE, formatLong, today } from "@/lib/dates";
import { eatenText, fmt, splitBrand, sum } from "@/lib/nutrition";
import { MEALS, MEAL_LABEL, type LogEntry } from "@/lib/types";
import { BottomNav } from "@/components/BottomNav";
import { CalorieRing, MacroBars } from "@/components/Progress";
import { WaterCard } from "@/components/WaterCard";
import { ChevronLeft, ChevronRight, Plus, Trash } from "@/components/icons";
import { deleteLog } from "./actions";

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { supabase, user } = await requireUser();
  const todayStr = await today();
  const sp = await searchParams;
  const date = sp.date && DATE_RE.test(sp.date) ? sp.date : todayStr;

  const [profile, reviewCount, logsRes, waterRes] = await Promise.all([
    getMyProfile(supabase, user.id),
    getReviewCount(supabase, user.id),
    supabase
      .from("food_logs")
      .select("*")
      .eq("logged_on", date)
      .order("created_at", { ascending: true }),
    supabase.from("water_logs").select("ml").eq("logged_on", date),
  ]);
  const water = (waterRes.data ?? []) as { ml: number }[];
  const waterTotal = water.reduce((s, w) => s + Number(w.ml), 0);
  const logs = (logsRes.data ?? []) as LogEntry[];
  const totals = sum(logs);

  const title =
    date === todayStr ? "Today" : date === addDays(todayStr, -1) ? "Yesterday" : formatLong(date).split(" ")[0].replace(",", "");
  const nextDate = addDays(date, 1);
  const canGoNext = nextDate <= todayStr;

  return (
    <>
      <main className="page">
        <header className="between" style={{ alignItems: "center" }}>
          <Link href={`/?date=${addDays(date, -1)}`} className="icon-btn" aria-label="Previous day">
            <ChevronLeft />
          </Link>
          <div style={{ textAlign: "center" }}>
            <h1 style={{ fontSize: 22 }}>{title}</h1>
            <div className="muted small">{formatLong(date)}</div>
          </div>
          {canGoNext ? (
            <Link
              href={nextDate === todayStr ? "/" : `/?date=${nextDate}`}
              className="icon-btn"
              aria-label="Next day"
            >
              <ChevronRight />
            </Link>
          ) : (
            <span className="icon-btn" aria-hidden="true" style={{ opacity: 0.35 }}>
              <ChevronRight />
            </span>
          )}
        </header>

        <section className="card" style={{ flexDirection: "row", alignItems: "center", gap: 20, padding: 20 }}>
          <CalorieRing eaten={totals.kcal} goal={profile.kcal_goal} />
          <div className="stack" style={{ gap: 14 }}>
            <div>
              <div className="muted small">Eaten</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                {fmt(totals.kcal)} <span className="muted small" style={{ fontWeight: 500 }}>kcal</span>
              </div>
            </div>
            <div>
              <div className="muted small">Goal</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                {fmt(profile.kcal_goal)}{" "}
                <span className="muted small" style={{ fontWeight: 500 }}>kcal</span>
              </div>
            </div>
          </div>
        </section>

        <section className="card">
          <h2>Macros</h2>
          <MacroBars
            values={{ protein: totals.protein_g, carbs: totals.carbs_g, fat: totals.fat_g }}
            goals={{ protein: profile.protein_goal, carbs: profile.carbs_goal, fat: profile.fat_goal }}
          />
        </section>

        <WaterCard total={waterTotal} goal={profile.water_goal_ml ?? 2000} date={date} entries={water.length} />

        <section className="stack">
          <h2>Meals</h2>
          {MEALS.map((meal) => {
            const items = logs.filter((l) => l.meal === meal);
            const addHref = `/add?meal=${meal}${date !== todayStr ? `&date=${date}` : ""}`;
            if (items.length === 0) {
              return (
                <Link
                  key={meal}
                  href={addHref}
                  style={{
                    border: "1.5px dashed #b9c9bf",
                    borderRadius: 16,
                    minHeight: 52,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  <Plus size={18} />
                  Add {MEAL_LABEL[meal].toLowerCase()}
                </Link>
              );
            }
            return (
              <div key={meal} className="card meal-card">
                <div className="meal-head">
                  <span className="meal-title">{MEAL_LABEL[meal]}</span>
                  <span className="meal-kcal">
                    <b>{fmt(sum(items).kcal)}</b> kcal
                  </span>
                  <Link href={addHref} className="meal-add" aria-label={`Add to ${MEAL_LABEL[meal].toLowerCase()}`}>
                    <Plus size={16} />
                  </Link>
                </div>
                {items.map((l) => {
                  const { name, brand } = splitBrand(l.name);
                  return (
                    <div key={l.id} className="meal-row">
                      <Link href={`/log/${l.id}`} className="meal-row-link">
                        <span className="meal-row-text">
                          <span className="meal-row-name">{name}</span>
                          <span className="meal-row-sub">
                            {brand ? `${brand} · ` : ""}
                            {eatenText(l.serving_label, Number(l.servings))}
                          </span>
                        </span>
                        <span className="meal-row-kcal">{fmt(l.kcal)}</span>
                      </Link>
                      <form action={deleteLog}>
                        <input type="hidden" name="id" value={l.id} />
                        <button className="meal-del" aria-label={`Remove ${l.name}`}>
                          <Trash size={15} />
                        </button>
                      </form>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </section>
      </main>
      <BottomNav active="today" reviewCount={reviewCount} />
    </>
  );
}
