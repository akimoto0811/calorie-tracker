import { cookies } from "next/headers";

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** The visitor's time zone, saved in a cookie by <TimezoneCookie />. Falls back to UTC. */
export async function getTimeZone(): Promise<string> {
  const tz = (await cookies()).get("tz")?.value;
  if (tz) {
    try {
      new Intl.DateTimeFormat("en", { timeZone: tz });
      return tz;
    } catch {
      /* invalid zone */
    }
  }
  return "UTC";
}

/** Today's date (YYYY-MM-DD) in the visitor's time zone. */
export async function today(): Promise<string> {
  const tz = await getTimeZone();
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
}

export function addDays(date: string, days: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatLong(date: string): string {
  return new Date(date + "T00:00:00Z").toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function formatShort(date: string): string {
  return new Date(date + "T00:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function weekdayShort(date: string): string {
  return new Date(date + "T00:00:00Z").toLocaleDateString("en-GB", {
    weekday: "short",
    timeZone: "UTC",
  });
}

/** Every date from start to end, inclusive. */
export function dateRange(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Current hour and minute in the visitor's time zone, for picking a default meal. */
export async function localNow(): Promise<Date> {
  const tz = await getTimeZone();
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 12) % 24;
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}
