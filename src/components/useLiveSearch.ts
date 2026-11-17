"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Search that updates results in place as you type, without reloading the page
 * (a reload flashes the loading screen and makes the page jump).
 * `run` fetches results; `urlFor` is the address kept in the browser bar so Back and refresh still work.
 */
export function useLiveSearch<T>(
  initialQ: string,
  initialData: T,
  run: (q: string) => Promise<T>,
  urlFor: (q: string) => string,
) {
  const [value, setValue] = useState(initialQ);
  const [data, setData] = useState(initialData);
  const [pending, setPending] = useState(false);
  const runRef = useRef(run);
  const urlRef = useRef(urlFor);
  runRef.current = run;
  urlRef.current = urlFor;
  const lastQ = useRef(initialQ.trim());
  const seq = useRef(0);

  const search = useCallback(async (q: string) => {
    const id = ++seq.current;
    lastQ.current = q;
    setPending(true);
    try {
      const result = await runRef.current(q);
      if (id !== seq.current) return; // a newer search has started
      setData(result);
      try {
        window.history.replaceState(window.history.state, "", urlRef.current(q));
      } catch {
        /* the address bar just won't update */
      }
    } finally {
      if (id === seq.current) setPending(false);
    }
  }, []);

  useEffect(() => {
    const q = value.trim();
    if (q === lastQ.current) return;
    const t = setTimeout(() => search(q), 250);
    return () => clearTimeout(t);
  }, [value, search]);

  /** Runs the current search again, e.g. after a filter changes or a food is removed. */
  const refresh = useCallback(() => search(value.trim()), [search, value]);

  return { value, setValue, data, pending, refresh };
}
