"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, Close } from "./icons";

const KEY = "in-app-pages";

/** Counts pages visited in this tab, so the back button knows whether there is an in-app page to return to. */
export function NavTracker() {
  const pathname = usePathname();
  useEffect(() => {
    try {
      const n = Number(sessionStorage.getItem(KEY) ?? "0");
      sessionStorage.setItem(KEY, String(n + 1));
    } catch {
      /* storage blocked: the back button falls back to its link */
    }
  }, [pathname]);
  return null;
}

/**
 * Goes back to the screen you came from (like the browser's back button).
 * If you opened this screen directly, goes to `fallback` instead.
 */
export function BackButton({ fallback, label = "Back", icon = "back" }: { fallback: string; label?: string; icon?: "back" | "close" }) {
  const router = useRouter();
  return (
    <a
      href={fallback}
      className="icon-btn"
      aria-label={label}
      onClick={(e) => {
        e.preventDefault();
        let visited = 0;
        try {
          visited = Number(sessionStorage.getItem(KEY) ?? "0");
        } catch {
          /* ignore */
        }
        if (visited > 1 && window.history.length > 1) router.back();
        else router.push(fallback);
      }}
    >
      {icon === "close" ? <Close /> : <ChevronLeft />}
    </a>
  );
}
