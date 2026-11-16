import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { getMyProfile, getReviewCount } from "@/lib/queries";
import { addDays, DATE_RE, formatLong, today } from "@/lib/dates";
import { fmt, sum } from "@/lib/nutrition";
import { MEALS, MEAL_LABEL, type LogEntry } from "@/lib/types";
import { BottomNav } from "@/components/BottomNav";
import { CalorieRing, MacroBars } from "@/components/Progress";
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

  const [profile, reviewCount, logsRes] = await Promise.all([
    getMyProfile(supabase, user.id),
    getReviewCount(supabase, user.id),
    supabase
      .from("food_logs")
      .select("*")
      .eq("logged_on", date)
      .order("created_at", { ascending: true }),
  ]);
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
              <div key={meal} className="card tight">
                <div className="between">
                  <span style={{ fontWeight: 700 }}>{MEAL_LABEL[meal]}</span>
                  <span className="muted" style={{ fontSize: 14 }}>
                    {fmt(sum(items).kcal)} kcal
                  </span>
                </div>
                {items.map((l) => (
                  <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                    <span className="grow">
                      {l.name}
                      <span className="muted">
                        {" "}
                        · {Number(l.servings) === 1 ? l.serving_label : `${fmt(l.servings, 2)} × ${l.serving_label}`}
                      </span>
                    </span>
                    <span className="muted">{fmt(l.kcal)}</span>
                    <form action={deleteLog}>
                      <input type="hidden" name="id" value={l.id} />
                      <button
                        className="icon-btn"
                        style={{ width: 32, height: 32, border: 0, color: "var(--muted)" }}
                        aria-label={`Remove ${l.name}`}
                      >
                        <Trash size={16} />
                      </button>
                    </form>
                  </div>
                ))}
                <Link href={addHref} style={{ fontSize: 14, fontWeight: 600 }}>
                  Add to {MEAL_LABEL[meal].toLowerCase()}
                </Link>
              </div>
            );
          })}
        </section>
      </main>
      <BottomNav active="today" reviewCount={reviewCount} />
    </>
  );
}
