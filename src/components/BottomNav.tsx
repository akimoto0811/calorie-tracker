import Link from "next/link";
import { Book, Chart, Home, Plus, User } from "./icons";

type Tab = "today" | "history" | "library" | "profile" | null;

export function BottomNav({ active, reviewCount = 0 }: { active: Tab; reviewCount?: number }) {
  const cls = (t: Tab) => (t === active ? "nav on" : "nav");
  const cur = (t: Tab) => (t === active ? ("page" as const) : undefined);
  return (
    <nav aria-label="Main" className="bottom-nav">
      <div className="bottom-nav-inner">
        <Link href="/" className={cls("today")} aria-current={cur("today")}>
          <Home size={24} />
          Today
        </Link>
        <Link href="/history" className={cls("history")} aria-current={cur("history")}>
          <Chart size={24} />
          History
        </Link>
        <Link href="/add" className="nav-add" aria-label="Add food">
          <Plus size={26} />
        </Link>
        <Link href="/library" className={cls("library")} aria-current={cur("library")}>
          <Book size={24} />
          Library
          {reviewCount > 0 && (
            <span className="badge" aria-label={`${reviewCount} waiting for review`}>
              {reviewCount}
            </span>
          )}
        </Link>
        <Link href="/profile" className={cls("profile")} aria-current={cur("profile")}>
          <User size={24} />
          Profile
        </Link>
      </div>
    </nav>
  );
}
