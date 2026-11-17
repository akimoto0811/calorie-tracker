"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { deleteFood } from "@/app/actions";
import { searchLibrary } from "@/app/search";
import { fmt } from "@/lib/nutrition";
import { foodTitle } from "@/lib/foodName";
import type { LibraryData, LibraryFilter } from "@/lib/librarySearch";
import { Plus, Search } from "@/components/icons";
import { SearchInput } from "@/components/SearchInput";
import { useLiveSearch } from "@/components/useLiveSearch";

const SOURCE_LABEL = { manual: "Manual", label: "Label photo", barcode: "Barcode" } as const;
const FILTERS: { key: LibraryFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "mine", label: "Added by me" },
  { key: "barcode", label: "Barcode" },
];

const urlFor = (filter: LibraryFilter, q: string) => `/library?f=${filter}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

export function LibraryBrowser({
  initial,
  userId,
  admin,
  banner,
}: {
  initial: LibraryData;
  userId: string;
  admin: boolean;
  /** Shown between the search bar and the list (the review reminder). */
  banner?: React.ReactNode;
}) {
  const [filter, setFilter] = useState<LibraryFilter>(initial.filter);
  // The search reads the filter from here, so a tap on a filter applies straight away.
  const filterRef = useRef(filter);
  const { value, setValue, data, pending, refresh } = useLiveSearch(
    initial.q,
    initial,
    (q) => searchLibrary({ q, filter: filterRef.current }),
    (q) => urlFor(filterRef.current, q),
  );

  function pickFilter(f: LibraryFilter) {
    if (f === filterRef.current) return;
    filterRef.current = f;
    setFilter(f);
    refresh();
  }

  async function remove(id: string) {
    const fd = new FormData();
    fd.set("id", id);
    await deleteFood(fd);
    await refresh();
  }

  const { foods, names, photos, browse, total, q } = data;

  return (
    <>
      {/* Search and filters stay at the top while the list scrolls under them. */}
      <div
        className="stack"
        style={{
          gap: 12,
          position: "sticky",
          top: 0,
          zIndex: 5,
          background: "var(--bg)",
          margin: "0 -20px",
          padding: "10px 20px 12px",
        }}
      >
        <SearchInput
          id="lq"
          value={value}
          onChange={setValue}
          pending={pending}
          placeholder="Search foods, brands or barcodes"
        />
        <nav className="chips" aria-label="Filter">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => pickFilter(f.key)}
              className={f.key === filter ? "chip on" : "chip"}
              aria-pressed={f.key === filter}
            >
              {f.label}
            </button>
          ))}
        </nav>
      </div>

      {banner}

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
              : data.filter === "mine"
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
                  <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.3 }}>{foodTitle(f, q).title}</div>
                  {(foodTitle(f, q).other || f.brand) && (
                    <div className="muted" style={{ fontSize: 13, lineHeight: 1.35 }}>
                      {[foodTitle(f, q).other, f.brand].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </div>
                <div className="muted small">
                  {fmt(f.kcal)} kcal · {f.serving_label} · P {fmt(f.protein_g, 1)} C {fmt(f.carbs_g, 1)} F{" "}
                  {fmt(f.fat_g, 1)}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span className="tag">{SOURCE_LABEL[f.source]}</span>
                  <span className="tag">
                    by {f.created_by === userId ? "you" : (names[f.created_by] ?? "a friend")}
                  </span>
                  {f.status === "pending" && <span className="tag warn">Waiting for review</span>}
                  {f.status === "private" && <span className="tag">Only you</span>}
                  {f.status === "rejected" && (
                    <span className="tag warn" title={f.review_note ?? undefined}>
                      Not approved{f.review_note ? `: ${f.review_note}` : ""}
                    </span>
                  )}
                </div>
                {(f.created_by === userId || admin) && (
                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <Link href={`/library/${f.id}/edit`} className="link-btn" style={{ fontSize: 13 }}>
                      Edit
                    </Link>
                    {f.created_by === userId && f.status !== "approved" && (
                      <button
                        type="button"
                        className="link-btn danger"
                        style={{ fontSize: 13 }}
                        onClick={() => remove(f.id)}
                      >
                        {f.status === "pending" ? "Withdraw" : "Remove"}
                      </button>
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
    </>
  );
}
