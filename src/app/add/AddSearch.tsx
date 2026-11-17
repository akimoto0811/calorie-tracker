"use client";

import Link from "next/link";
import { searchFoodsToLog } from "@/app/search";
import { fmt } from "@/lib/nutrition";
import type { AddResult } from "@/lib/librarySearch";
import { ChevronRight, Search } from "@/components/icons";
import { foodTitle } from "@/lib/foodName";
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
        // A tinted box so results can't be mistaken for the Recent list below.
        <section
          className="stack"
          aria-live="polite"
          style={{
            gap: 10,
            padding: 12,
            borderRadius: 20,
            background: "var(--green-soft)",
            border: "1px solid var(--green)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 4px" }}>
            <Search size={16} style={{ color: "var(--green)" }} />
            <h2 className="grow" style={{ fontSize: 15, fontFamily: "var(--font)", fontWeight: 700, color: "var(--green-dark)" }}>
              {data.results.length === 0
                ? `No library foods match “${data.q}”`
                : `${data.results.length === 25 ? "25+" : data.results.length} found for “${data.q}”`}
            </h2>
            <button type="button" className="link-btn" style={{ fontSize: 13 }} onClick={() => setValue("")}>
              Clear
            </button>
          </div>
          {data.results.length === 0 ? (
            <p className="small" style={{ padding: "0 4px 4px" }}>
              <Link href={`/add/manual?${qs}`}>Add it yourself</Link>
            </p>
          ) : (
            <div className="list">
              {data.results.map((f) => {
                const { title, other } = foodTitle(f, data.q);
                return (
                  <Link
                    key={f.id}
                    href={`/add/food/${f.id}?${qs}`}
                    className="row"
                    style={{ textDecoration: "none", color: "var(--text)" }}
                  >
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>{title}</div>
                      {other && (
                        <div className="muted" style={{ fontSize: 13 }}>
                          {other}
                        </div>
                      )}
                      <div className="muted small">
                        {fmt(f.kcal)} kcal · {f.serving_label}
                        {f.brand ? ` · ${f.brand}` : ""}
                      </div>
                    </div>
                    <ChevronRight size={18} className="muted" />
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}
    </>
  );
}
