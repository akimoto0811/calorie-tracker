"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "@/components/icons";

/** Search box that shows results as you type (no need to press Enter). */
export function LibrarySearch({ filter, initial }: { filter: string; initial: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [pending, start] = useTransition();
  const last = useRef(initial.trim());

  useEffect(() => {
    const q = value.trim();
    if (q === last.current) return;
    const t = setTimeout(() => {
      last.current = q;
      const url = `/library?f=${filter}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
      start(() => router.replace(url, { scroll: false }));
    }, 250);
    return () => clearTimeout(t);
  }, [value, filter, router]);

  return (
    <form
      action="/library"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        (document.activeElement as HTMLElement | null)?.blur();
      }}
    >
      <input type="hidden" name="f" value={filter} />
      <div className="search">
        {pending ? <span className="spinner" style={{ width: 18, height: 18 }} /> : <Search className="muted" />}
        <label htmlFor="lq" className="sr-only">
          Search foods
        </label>
        <input
          id="lq"
          name="q"
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search foods, brands or barcodes"
          autoComplete="off"
          enterKeyHint="search"
        />
      </div>
    </form>
  );
}
