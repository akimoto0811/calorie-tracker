import { BackButton } from "@/components/BackButton";
import { requireUser } from "@/lib/supabase/server";
import { amIAdmin, getNames } from "@/lib/queries";
import type { Food } from "@/lib/types";
import { ReviewList } from "./ReviewList";

/** Every food waiting for review, to approve or reject many at once. */
export default async function ReviewAll() {
  const { supabase, user } = await requireUser();
  const admin = await amIAdmin(supabase);
  let pending = supabase.from("foods").select("*").eq("status", "pending");
  if (!admin) pending = pending.neq("created_by", user.id);
  const { data } = await pending.order("created_at", { ascending: true }).limit(500);
  const foods = (data ?? []) as Food[];
  const names = await getNames(
    supabase,
    foods.map((f) => f.created_by),
  );
  const by = Object.fromEntries(
    foods.map((f) => [f.id, f.created_by === user.id ? "you" : (names[f.created_by] ?? "a friend")]),
  );

  return (
    <main className="page no-nav" style={{ gap: 16 }}>
      <header className="topbar">
        <BackButton fallback="/review" />
        <div className="grow">
          <h1 style={{ fontSize: 24 }}>Review many</h1>
          <div className="muted small">{foods.length === 0 ? "Nothing waiting" : `${foods.length} waiting`}</div>
        </div>
      </header>
      <ReviewList foods={foods} by={by} />
    </main>
  );
}
