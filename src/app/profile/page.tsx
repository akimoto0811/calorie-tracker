import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { getMyProfile, getReviewCount } from "@/lib/queries";
import { BottomNav } from "@/components/BottomNav";
import { ChevronRight, Lock } from "@/components/icons";
import { GoalsForm } from "./GoalsForm";
import { InviteForm } from "./InviteForm";
import { NameEditor } from "./NameEditor";

export default async function ProfilePage() {
  const { supabase, user } = await requireUser();
  const [profile, reviewCount, shared] = await Promise.all([
    getMyProfile(supabase, user.id),
    getReviewCount(supabase, user.id),
    supabase
      .from("foods")
      .select("id", { count: "exact", head: true })
      .eq("created_by", user.id)
      .in("status", ["pending", "approved"]),
  ]);
  const name = profile.display_name || user.email?.split("@")[0] || "You";
  const provider = user.app_metadata?.provider === "google" ? "Google" : "email";

  return (
    <>
      <main className="page" style={{ gap: 16 }}>
        <header style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            className="display"
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              background: "var(--green)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              fontWeight: 700,
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            {name.charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0, flexGrow: 1 }}>
            <NameEditor name={name} />
            <div className="muted small" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
              Signed in with {provider}
              {user.email ? ` · ${user.email}` : ""}
            </div>
          </div>
        </header>

        <GoalsForm profile={profile} />

        <section className="list">
          <Link href="/review" className="prow">
            <span>Review queue</span>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {reviewCount > 0 && <span className="badge">{reviewCount}</span>}
              <ChevronRight size={18} className="muted" />
            </span>
          </Link>
          <Link href="/library?f=mine" className="prow">
            <span>Foods I&apos;ve shared</span>
            <span className="muted" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {shared.count ?? 0}
              <ChevronRight size={18} />
            </span>
          </Link>
          <form action="/auth/signout" method="post">
            <button className="prow" style={{ color: "var(--danger)", fontWeight: 600 }}>
              Sign out
            </button>
          </form>
        </section>

        <InviteForm />

        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, lineHeight: 1.45, color: "var(--muted-2)", padding: "0 4px" }}>
          <Lock size={18} style={{ color: "var(--green)", flexShrink: 0 }} />
          Your food log and goals are private. Friends only see your name and the foods you choose to share with the
          library.
        </div>
      </main>
      <BottomNav active="profile" reviewCount={reviewCount} />
    </>
  );
}
