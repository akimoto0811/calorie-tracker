import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { getMyProfile, getReviewCount } from "@/lib/queries";
import { addDays, dateRange, formatShort, today, weekdayShort } from "@/lib/dates";
import { fmt } from "@/lib/nutrition";
import { BottomNav } from "@/components/BottomNav";

const RANGES = [
  { key: "week", label: "Week", days: 7 },
  { key: "month", label: "Month", days: 30 },
  { key: "3m", label: "3 months", days: 90 },
] as const;

type Day = { date: string; kcal: number; protein: number; carbs: number; fat: number; entries: number };

export default async function History({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { supabase, user } = await requireUser();
  const sp = await searchParams;
  const range = RANGES.find((r) => r.key === sp.range) ?? RANGES[0];
  const end = await today();
  const start = addDays(end, -(range.days - 1));

  const [profile, reviewCount, { data }] = await Promise.all([
    getMyProfile(supabase, user.id),
    getReviewCount(supabase, user.id),
    supabase
      .from("food_logs")
      .select("logged_on, kcal, protein_g, carbs_g, fat_g")
      .gte("logged_on", start)
      .lte("logged_on", end)
      .limit(10000),
  ]);

  const byDate = new Map<string, Day>(
    dateRange(start, end).map((d) => [d, { date: d, kcal: 0, protein: 0, carbs: 0, fat: 0, entries: 0 }]),
  );
  for (const r of data ?? []) {
    const d = byDate.get(r.logged_on);
    if (!d) continue;
    d.kcal += Number(r.kcal);
    d.protein += Number(r.protein_g);
    d.carbs += Number(r.carbs_g);
    d.fat += Number(r.fat_g);
    d.entries += 1;
  }
  const days = [...byDate.values()];
  const goal = profile.kcal_goal;

  // Stats use finished days you logged something on (today is still in progress).
  const full = days.filter((d) => d.date !== end && d.entries > 0);
  const avg = (f: (d: Day) => number) => (full.length ? full.reduce((s, d) => s + f(d), 0) / full.length : 0);
  const onTarget = full.filter((d) => d.kcal <= goal * 1.05).length;

  const tot = days.reduce(
    (s, d) => ({ p: s.p + d.protein * 4, c: s.c + d.carbs * 4, f: s.f + d.fat * 9 }),
    { p: 0, c: 0, f: 0 },
  );
  const macroTotal = tot.p + tot.c + tot.f;
  const pct = (v: number) => (macroTotal ? Math.round((v / macroTotal) * 100) : 0);
  const split = { p: pct(tot.p), c: pct(tot.c), f: pct(tot.f) };

  // Chart scale
  const H = 200;
  const top = Math.max(goal * 1.25, ...days.map((d) => d.kcal), 1);
  const y = (v: number) => Math.round((v / top) * (H - 24));
  const showEvery = range.days <= 7 ? 1 : range.days <= 30 ? 7 : 14;

  return (
    <>
      <main className="page" style={{ gap: 16 }}>
        <h1>History</h1>

        <nav className="seg" aria-label="Range">
          {RANGES.map((r) => (
            <Link
              key={r.key}
              href={`/history?range=${r.key}`}
              className={r === range ? "on" : undefined}
              aria-current={r === range ? "true" : undefined}
              replace
            >
              {r.label}
            </Link>
          ))}
        </nav>

        <section className="card">
          <div className="between">
            <h2 style={{ fontFamily: "var(--font)", fontSize: 16 }}>Calories</h2>
            <span className="muted small">
              {formatShort(start)} – {formatShort(end)}
            </span>
          </div>
          <div
            style={{ position: "relative", height: H }}
            role="img"
            aria-label={`Daily calories compared with a ${fmt(goal)} kcal goal`}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 20 + y(goal),
                borderTop: "2px dashed var(--muted)",
              }}
            />
            <div
              style={{
                position: "absolute",
                right: 0,
                bottom: 24 + y(goal),
                fontSize: 11,
                fontWeight: 600,
                color: "var(--muted-2)",
                background: "var(--surface)",
                padding: "0 4px",
              }}
            >
              Goal {fmt(goal)}
            </div>
            <div style={{ position: "absolute", inset: 0, display: "flex", gap: range.days <= 7 ? 6 : 2 }}>
              {days.map((d, i) => {
                const isToday = d.date === end;
                const color = isToday ? "var(--green-light)" : d.kcal > goal * 1.05 ? "var(--warn)" : "var(--green)";
                const label = isToday ? "Today" : range.days <= 7 ? weekdayShort(d.date) : formatShort(d.date);
                const showLabel = range.days <= 7 || (days.length - 1 - i) % showEvery === 0;
                return (
                  <div
                    key={d.date}
                    title={`${formatShort(d.date)}: ${fmt(d.kcal)} kcal`}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: 6,
                      height: "100%",
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: range.days <= 7 ? 26 : "100%",
                        maxWidth: 26,
                        height: Math.max(d.kcal > 0 ? 3 : 0, y(d.kcal)),
                        background: color,
                        borderRadius: range.days <= 7 ? "6px 6px 2px 2px" : "2px 2px 0 0",
                      }}
                    />
                    <div
                      style={{
                        fontSize: range.days <= 7 ? 12 : 10,
                        height: 14,
                        whiteSpace: "nowrap",
                        color: isToday ? "var(--text)" : "var(--muted)",
                        fontWeight: isToday ? 700 : 400,
                        visibility: showLabel ? "visible" : "hidden",
                      }}
                    >
                      {label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="legend">
            <span><span className="swatch" style={{ background: "var(--green)" }} />Within goal</span>
            <span><span className="swatch" style={{ background: "var(--warn)" }} />Over goal</span>
            <span><span className="swatch" style={{ background: "var(--green-light)" }} />Today</span>
          </div>
        </section>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
          <div className="tile">
            <span className="muted" style={{ fontSize: 12 }}>Daily average</span>
            <b>{full.length ? fmt(avg((d) => d.kcal)) : "–"}</b>
            <span className="muted" style={{ fontSize: 12 }}>kcal</span>
          </div>
          <div className="tile">
            <span className="muted" style={{ fontSize: 12 }}>On target</span>
            <b>{full.length ? `${onTarget} of ${full.length}` : "–"}</b>
            <span className="muted" style={{ fontSize: 12 }}>logged days</span>
          </div>
          <div className="tile">
            <span className="muted" style={{ fontSize: 12 }}>Avg protein</span>
            <b>{full.length ? `${fmt(avg((d) => d.protein))} g` : "–"}</b>
            <span className="muted" style={{ fontSize: 12 }}>goal {fmt(profile.protein_goal)} g</span>
          </div>
        </div>

        <section className="card">
          <h2 style={{ fontFamily: "var(--font)", fontSize: 16 }}>Where your calories came from</h2>
          {macroTotal === 0 ? (
            <p className="muted small">Log some food to see your protein, carbs and fat split.</p>
          ) : (
            <>
              <div
                style={{ display: "flex", height: 14, borderRadius: 7, overflow: "hidden", gap: 2 }}
                role="img"
                aria-label={`Protein ${split.p} percent, carbs ${split.c} percent, fat ${split.f} percent`}
              >
                <div style={{ width: `${split.p}%`, background: "var(--protein)" }} />
                <div style={{ width: `${split.c}%`, background: "var(--carbs)" }} />
                <div style={{ width: `${split.f}%`, background: "var(--fat)" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, fontSize: 13 }}>
                {[
                  { l: "Protein", v: split.p, c: "var(--protein)" },
                  { l: "Carbs", v: split.c, c: "var(--carbs)" },
                  { l: "Fat", v: split.f, c: "var(--fat)" },
                ].map((m) => (
                  <div key={m.l} className="stack" style={{ gap: 2 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted-2)" }}>
                      <span className="swatch" style={{ background: m.c }} />
                      {m.l}
                    </span>
                    <b>{m.v}%</b>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </main>
      <BottomNav active="history" reviewCount={reviewCount} />
    </>
  );
}
