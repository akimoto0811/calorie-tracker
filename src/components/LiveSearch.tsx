"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "./icons";

/**
 * Search box that shows results as you type (no need to press Enter).
 * It updates `?q=` on `path`, keeping the other `params`.
 */
export function LiveSearch({
  path,
  params,
  initial,
  id,
  label,
  placeholder,
}: {
  path: string;
  params: Record<string, string>;
  initial: string;
  id: string;
  label?: string;
  placeholder: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [pending, start] = useTransition();
  const last = useRef(initial.trim());
  const paramsKey = JSON.stringify(params);

  useEffect(() => {
    const q = value.trim();
    if (q === last.current) return;
    const t = setTimeout(() => {
      last.current = q;
      const qs = new URLSearchParams(JSON.parse(paramsKey) as Record<string, string>);
      if (q) qs.set("q", q);
      const s = qs.toString();
      start(() => router.replace(s ? `${path}?${s}` : path, { scroll: false }));
    }, 250);
    return () => clearTimeout(t);
  }, [value, path, paramsKey, router]);

  return (
    <form
      action={path}
      role="search"
      className="stack"
      style={{ gap: 8 }}
      onSubmit={(e) => {
        e.preventDefault();
        (document.activeElement as HTMLElement | null)?.blur();
      }}
    >
      <label htmlFor={id} className={label ? undefined : "sr-only"} style={{ fontSize: 14, fontWeight: 600 }}>
        {label ?? "Search foods"}
      </label>
      <div className="search">
        {pending ? <span className="spinner" /> : <Search className="muted" />}
        <input
          id={id}
          name="q"
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          enterKeyHint="search"
        />
      </div>
    </form>
  );
}
