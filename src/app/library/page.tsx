import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { amIAdmin, getReviewCount } from "@/lib/queries";
import { cleanFilter, loadLibrary } from "@/lib/librarySearch";
import { BottomNav } from "@/components/BottomNav";
import { ChevronRight } from "@/components/icons";
import { LibraryBrowser } from "./LibraryBrowser";

export default async function Library({ searchParams }: { searchParams: Promise<{ q?: string; f?: string }> }) {
  const { supabase, user } = await requireUser();
  const sp = await searchParams;
  const [initial, reviewCount, admin] = await Promise.all([
    loadLibrary(supabase, user.id, sp.q ?? "", cleanFilter(sp.f)),
    getReviewCount(supabase, user.id),
    amIAdmin(supabase),
  ]);

  return (
    <>
      <main className="page" style={{ gap: 16 }}>
        <header style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div className="stack grow" style={{ gap: 4 }}>
            <h1>Food library</h1>
            <p className="muted" style={{ fontSize: 14 }}>
              Foods added by you and your friends
            </p>
          </div>
          {admin && (
            <Link
              href="/library/import"
              className="btn btn-secondary"
              style={{ width: "auto", height: 40, fontSize: 14, padding: "0 14px", flexShrink: 0, marginTop: 4 }}
            >
              Bulk upload
            </Link>
          )}
        </header>

        <LibraryBrowser
          initial={initial}
          userId={user.id}
          admin={admin}
          banner={
            reviewCount > 0 ? (
              <Link
                href="/review"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  borderRadius: 16,
                  background: "var(--warn-soft)",
                  border: "1px solid var(--warn-line)",
                  textDecoration: "none",
                  color: "var(--text)",
                }}
              >
                <span className="badge" style={{ width: 32, height: 32, borderRadius: 16, fontSize: 15 }}>
                  {reviewCount}
                </span>
                <div className="grow">
                  <div style={{ fontWeight: 700 }}>Waiting for review</div>
                  <div className="muted small">Check new foods before they go live</div>
                </div>
                <ChevronRight size={18} className="muted" />
              </Link>
            ) : null
          }
        />

        <p className="muted small" style={{ textAlign: "center" }}>
          Can&apos;t find it?{" "}
          <Link href="/add" style={{ fontWeight: 600 }}>
            Add a new food
          </Link>
        </p>
      </main>
      <BottomNav active="library" reviewCount={reviewCount} />
    </>
  );
}
