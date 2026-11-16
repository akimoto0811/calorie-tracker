import Link from "next/link";
import { ChevronLeft } from "./icons";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="page no-nav legal">
      <header className="topbar">
        <Link href="/" className="icon-btn" aria-label="Back to the app">
          <ChevronLeft />
        </Link>
        <h1 style={{ fontSize: 24 }}>{title}</h1>
      </header>
      <p className="muted small">Last updated {updated}</p>
      <article className="card" style={{ lineHeight: 1.55, fontSize: 15 }}>
        {children}
      </article>
    </main>
  );
}
