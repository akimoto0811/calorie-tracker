import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { amIAdmin, getNames, getReviewCount } from "@/lib/queries";
import { fmt } from "@/lib/nutrition";
import type { Food } from "@/lib/types";
import { BottomNav } from "@/components/BottomNav";
import { ChevronRight, Plus, Search } from "@/components/icons";
import { deleteFood } from "../actions";

const SOURCE_LABEL = { manual: "Manual", label: "Label photo", barcode: "Barcode" } as const;
const FILTERS = [
  { key: "all", label: "All" },
  { key: "mine", label: "Added by me" },
  { key: "barcode", label: "Barcode" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

export default async function Library({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; f?: string }>;
}) {
  const { supabase, user } = await requireUser();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const filter: FilterKey = FILTERS.some((f) => f.key === sp.f) ? (sp.f as FilterKey) : "all";

  let query = supabase.from("foods").select("*").order("name").limit(100);
  if (filter === "mine") {
    query = query.eq("created_by", user.id);
  } else {
    query = query.eq("status", "approved");
  }
  if (filter === "barcode") query = query.not("barcode", "is", null);
  if (q) {
    const term = `*${q.replace(/[%_*,().]/g, " ").trim()}*`;
    query = query.or(`name.ilike.${term},brand.ilike.${term}`);
  }

  const [{ data }, reviewCount, admin] = await Promise.all([
    query,
    getReviewCount(supabase, user.id),
    amIAdmin(supabase),
  ]);
  const foods = (data ?? []) as Food[];
  const names = await getNames(supabase, foods.map((f) => f.created_by));
  const link = (f: FilterKey) => `/library?f=${f}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <main className="page" style={{ gap: 16 }}>
        <header className="stack" style={{ gap: 4 }}>
          <h1>Food library</h1>
          <p className="muted" style={{ fontSize: 14 }}>
            Foods added by you and your friends
          </p>
        </header>

        <form action="/library" role="search">
          <input type="hidden" name="f" value={filter} />
          <div className="search">
            <Search className="muted" />
            <label htmlFor="lq" className="sr-only">
              Search foods
            </label>
            <input id="lq" name="q" type="search" defaultValue={q} placeholder="Search foods" />
          </div>
        </form>

        <nav className="chips" aria-label="Filter">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={link(f.key)}
              className={f.key === filter ? "chip on" : "chip"}
              aria-current={f.key === filter ? "true" : undefined}
              replace
            >
              {f.label}
            </Link>
          ))}
        </nav>

        {reviewCount > 0 && (
          <Link
            href="/review"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 16px",
              borderRadius: 16,
              background: "var(--warn-soft)",
              border: "1px solid var(--warn-line)",
              textDecoration: "none",
              color: "var(--text)",
            }}
          >
            <span className="badge" style={{ width: 32, height: 32, borderRadius: 16, fontSize: 15 }}>
              {reviewCount}
            </span>
            <div className="grow">
              <div style={{ fontWeight: 700 }}>Waiting for review</div>
              <div className="muted small">Check new foods before they go live</div>
            </div>
            <ChevronRight size={18} className="muted" />
          </Link>
        )}

        {foods.length === 0 ? (
          <div className="card" style={{ alignItems: "center", textAlign: "center" }}>
            <p className="muted">
              {q
                ? `Nothing matches “${q}”.`
                : filter === "mine"
                  ? "You haven't added any foods yet. Use “Add a new food” below, then “Save to library only” if you don't want to log it."
                  : "The library is empty so far. Foods appear here once a friend approves them."}
            </p>
          </div>
        ) : (
          <div className="list">
            {foods.map((f) => (
              <div key={f.id} className="row">
                <div className="grow stack" style={{ gap: 4 }}>
                  <div style={{ fontWeight: 600 }}>{f.name}</div>
                  <div className="muted small">
                    {fmt(f.kcal)} kcal · {f.serving_label} · P {fmt(f.protein_g, 1)} C {fmt(f.carbs_g, 1)} F{" "}
                    {fmt(f.fat_g, 1)}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span className="tag">{SOURCE_LABEL[f.source]}</span>
                    <span className="tag">by {f.created_by === user.id ? "you" : names[f.created_by] ?? "a friend"}</span>
                    {f.status === "pending" && <span className="tag warn">Waiting for review</span>}
                    {f.status === "private" && <span className="tag">Only you</span>}
                    {f.status === "rejected" && (
                      <span className="tag warn" title={f.review_note ?? undefined}>
                        Not approved{f.review_note ? `: ${f.review_note}` : ""}
                      </span>
                    )}
                  </div>
                  {(f.created_by === user.id || admin) && (
                    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                      <Link href={`/library/${f.id}/edit`} className="link-btn" style={{ fontSize: 13 }}>
                        Edit
                      </Link>
                      {f.created_by === user.id && f.status !== "approved" && (
                        <form action={deleteFood}>
                          <input type="hidden" name="id" value={f.id} />
                          <button className="link-btn danger" style={{ fontSize: 13 }}>
                            {f.status === "pending" ? "Withdraw" : "Remove"}
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
                <Link href={`/add/food/${f.id}`} className="round-add" aria-label={`Log ${f.name}`}>
                  <Plus size={18} />
                </Link>
              </div>
            ))}
          </div>
        )}

        <p className="muted small" style={{ textAlign: "center" }}>
          Can&apos;t find it? <Link href="/add" style={{ fontWeight: 600 }}>Add a new food</Link>
        </p>
      </main>
      <BottomNav active="library" reviewCount={reviewCount} />
    </>
  );
}
