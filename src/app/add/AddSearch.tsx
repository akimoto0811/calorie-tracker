"use client";

import Link from "next/link";
import { searchFoodsToLog } from "@/app/search";
import { fmt } from "@/lib/nutrition";
import type { AddResult } from "@/lib/librarySearch";
import { ChevronRight } from "@/components/icons";
import { SearchInput } from "@/components/SearchInput";
import { useLiveSearch } from "@/components/useLiveSearch";

/** "Or search the shared library" on Add food: results update in place as you type. */
export function AddSearch({ initialQ, initial, qs }: { initialQ: string; initial: AddResult[]; qs: string }) {
  const { value, setValue, data, pending } = useLiveSearch(
    initialQ,
    { q: initialQ.trim(), results: initial },
    async (q) => ({ q, results: await searchFoodsToLog(q) }),
    (q) => `/add?${qs}${q ? `&q=${encodeURIComponent(q)}` : ""}`,
  );

  return (
    <>
      <SearchInput
        id="q"
        value={value}
        onChange={setValue}
        pending={pending}
        label="Or search the shared library"
        placeholder="e.g. oat milk, chicken breast"
      />

      {data.q && (
        <section className="stack" style={{ gap: 8 }}>
          <h2 className="muted" style={{ fontSize: 14, fontFamily: "var(--font)", fontWeight: 600 }}>
            Results for “{data.q}”
          </h2>
          {data.results.length === 0 ? (
            <p className="muted small">
              Nothing found. <Link href={`/add/manual?${qs}`}>Add it yourself</Link>
            </p>
          ) : (
            <div className="list">
              {data.results.map((f) => (
                <Link
                  key={f.id}
                  href={`/add/food/${f.id}?${qs}`}
                  className="row"
                  style={{ textDecoration: "none", color: "var(--text)" }}
                >
                  <div className="grow">
                    <div style={{ fontWeight: 600 }}>{f.name}</div>
                    <div className="muted small">
                      {fmt(f.kcal)} kcal · {f.serving_label}
                      {f.brand ? ` · ${f.brand}` : ""}
                    </div>
                  </div>
                  <ChevronRight size={18} className="muted" />
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}
