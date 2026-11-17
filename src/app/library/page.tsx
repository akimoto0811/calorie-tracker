import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { amIAdmin, getNames, getReviewCount, signedPhotoUrls } from "@/lib/queries";
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
    query = query.or(`name.ilike.${term},local_name.ilike.${term},brand.ilike.${term},barcode.ilike.${term}`);
  }

  // The shared library is long, so its foods only show once you search. "Added by me" always lists.
  const browse = filter === "mine" || q !== "";
  const [{ data }, reviewCount, admin, total] = await Promise.all([
    browse ? query : Promise.resolve({ data: [] as Food[] }),
    getReviewCount(supabase, user.id),
    amIAdmin(supabase),
    browse
      ? Promise.resolve(null)
      : supabase.from("foods").select("id", { count: "exact", head: true }).eq("status", "approved").then((r) => r.count),
  ]);
  const foods = (data ?? []) as Food[];
  const [names, photos] = await Promise.all([
    getNames(supabase, foods.map((f) => f.created_by)),
    signedPhotoUrls(supabase, foods.map((f) => f.photo_path)),
  ]);
  const link = (f: FilterKey) => `/library?f=${f}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <main className="page" style={{ gap: 16 }}>
        <header style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div className="stack grow" style={{ gap: 4 }}>
            <h1>Food library</h1>
            <p className="muted" style={{ fontSize: 14 }}>
              Foods added by you and your friends
            </p>
          </div>
          {admin && (
            <Link
              href="/library/import"
              className="btn btn-secondary"
              style={{ width: "auto", height: 40, fontSize: 14, padding: "0 14px", flexShrink: 0, marginTop: 4 }}
            >
              Bulk upload
            </Link>
          )}
        </header>

        <form action="/library" role="search">
          <input type="hidden" name="f" value={filter} />
          <div className="search">
            <Search className="muted" />
            <label htmlFor="lq" className="sr-only">
              Search foods
            </label>
            <input id="lq" name="q" type="search" defaultValue={q} placeholder="Search foods, brands or barcodes" />
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

        {!browse ? (
          <div className="card" style={{ alignItems: "center", textAlign: "center", gap: 6 }}>
            <Search className="muted" />
            <p style={{ fontWeight: 600 }}>
              {total ? `${total.toLocaleString("en-GB")} foods in the library` : "Search the library"}
            </p>
            <p className="muted small">Type a food, brand or barcode above to find it.</p>
          </div>
        ) : foods.length === 0 ? (
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
                {f.photo_path && photos[f.photo_path] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photos[f.photo_path]} alt="" className="food-thumb" />
                )}
                <div className="grow stack" style={{ gap: 4 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.3 }}>{f.name}</div>
                    {(f.local_name || f.brand) && (
                      <div className="muted" style={{ fontSize: 13, lineHeight: 1.35 }}>
                        {[f.local_name, f.brand].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </div>
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
