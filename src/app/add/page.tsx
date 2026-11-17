import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { searchToLog } from "@/lib/librarySearch";
import { AddSearch } from "./AddSearch";
import { readAddParams, type AddSearchParams } from "@/lib/addParams";
import { amountText, fmt } from "@/lib/nutrition";
import { MEALS, MEAL_LABEL, type LogEntry } from "@/lib/types";
import { Barcode, Camera, ChevronRight, Close, Pencil } from "@/components/icons";
import { QuickAdd } from "@/components/QuickAdd";

export default async function AddFood({ searchParams }: { searchParams: AddSearchParams }) {
  const { supabase, user } = await requireUser();
  const { meal, date, today, q, qs } = await readAddParams(searchParams);
  const dateQs = date !== today ? `&date=${date}` : "";

  const results = await searchToLog(supabase, user.id, q);

  // Recent: the last distinct things you logged.
  const { data: recentRows } = await supabase
    .from("food_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(60);
  const seen = new Set<string>();
  const recent: LogEntry[] = [];
  for (const r of (recentRows ?? []) as LogEntry[]) {
    const key = `${r.name}|${r.servings}|${r.serving_label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    recent.push(r);
    if (recent.length >= 8) break;
  }

  return (
    <main className="page no-nav">
      <header className="topbar">
        <Link href={date !== today ? `/?date=${date}` : "/"} className="icon-btn" aria-label="Close">
          <Close />
        </Link>
        <h1 style={{ fontSize: 24 }}>Add food</h1>
      </header>

      <nav className="chips" aria-label="Meal">
        {MEALS.map((m) => (
          <Link
            key={m}
            href={`/add?meal=${m}${dateQs}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={m === meal ? "chip on" : "chip"}
            aria-current={m === meal ? "true" : undefined}
            replace
          >
            {MEAL_LABEL[m]}
          </Link>
        ))}
      </nav>

      <div className="stack">
        <Link href={`/add/scan?${qs}`} className="method">
          <div className="method-icon">
            <Barcode size={26} />
          </div>
          <div className="grow">
            <div style={{ fontWeight: 700, fontSize: 16 }}>Scan barcode</div>
            <div className="muted" style={{ fontSize: 14, marginTop: 2 }}>
              Fills in nutrition automatically
            </div>
          </div>
          <ChevronRight size={18} className="muted" />
        </Link>
        <Link href={`/add/label?${qs}`} className="method">
          <div className="method-icon">
            <Camera size={26} />
          </div>
          <div className="grow">
            <div style={{ fontWeight: 700, fontSize: 16 }}>Snap nutrition label</div>
            <div className="muted" style={{ fontSize: 14, marginTop: 2 }}>
              Take a photo and we read it for you
            </div>
          </div>
          <ChevronRight size={18} className="muted" />
        </Link>
        <Link href={`/add/manual?${qs}`} className="method">
          <div className="method-icon">
            <Pencil size={26} />
          </div>
          <div className="grow">
            <div style={{ fontWeight: 700, fontSize: 16 }}>Enter manually</div>
            <div className="muted" style={{ fontSize: 14, marginTop: 2 }}>
              Type calories and macros yourself
            </div>
          </div>
          <ChevronRight size={18} className="muted" />
        </Link>
      </div>

      <AddSearch initialQ={q} initial={results} qs={qs} />

      {recent.length > 0 && (
        <section className="stack" style={{ gap: 8 }}>
          <h2 className="muted" style={{ fontSize: 14, fontFamily: "var(--font)", fontWeight: 600 }}>
            Recent
          </h2>
          <div className="list">
            {recent.map((r) => (
              <div key={r.id} className="row">
                <div className="grow">
                  <div style={{ fontWeight: 600 }}>{r.name}</div>
                  <div className="muted small">
                    {fmt(r.kcal)} kcal ·{" "}
                    {amountText(r.serving_label, Number(r.servings))}
                  </div>
                </div>
                <QuickAdd logId={r.id} meal={meal} date={date} label={r.name} />
              </div>
            ))}
          </div>
          <p className="muted small" style={{ textAlign: "center" }}>
            Tapping + adds it to {MEAL_LABEL[meal].toLowerCase()}.
          </p>
        </section>
      )}
    </main>
  );
}
