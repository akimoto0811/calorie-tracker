import { BackButton } from "@/components/BackButton";
import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { amIAdmin, getNames, signedPhotoUrl } from "@/lib/queries";
import type { Food } from "@/lib/types";
import { ReviewCard } from "./ReviewCard";

function ago(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)} min ago`;
  const h = Math.round(mins / 60);
  if (h < 48) return `${h} hour${h === 1 ? "" : "s"} ago`;
  return `${Math.round(h / 24)} days ago`;
}

export default async function ReviewQueue() {
  const { supabase, user } = await requireUser();
  const admin = await amIAdmin(supabase);
  let pending = supabase.from("foods").select("*").eq("status", "pending");
  if (!admin) pending = pending.neq("created_by", user.id);
  const { data } = await pending
    .order("created_at", { ascending: true })
    .limit(50);
  const queue = (data ?? []) as Food[];
  const { count: mineWaiting } = await supabase
    .from("foods")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
    .eq("created_by", user.id);

  const food = queue[0];
  let similar: string | null = null;
  let photo: string | null = null;
  let by = "a friend";
  if (food) {
    const word = food.name.split(/\s|,/).find((w) => w.length >= 3) ?? food.name;
    const [names, url, sim] = await Promise.all([
      getNames(supabase, [food.created_by]),
      signedPhotoUrl(supabase, food.label_photo_path),
      food.barcode
        ? supabase.from("foods").select("name").eq("status", "approved").eq("barcode", food.barcode).limit(1)
        : supabase
            .from("foods")
            .select("name")
            .eq("status", "approved")
            .ilike("name", `%${word.replace(/[%_]/g, "")}%`)
            .limit(1),
    ]);
    by = food.created_by === user.id ? "you" : names[food.created_by] ?? "a friend";
    photo = url;
    similar = sim.data?.[0]?.name ?? null;
  }

  return (
    <main className="page no-nav" style={{ gap: 16 }}>
      <header className="topbar">
        <BackButton fallback="/library" />
        <div className="grow">
          <h1 style={{ fontSize: 24 }}>Review</h1>
          <div className="muted small">
            {queue.length === 0 ? "Nothing waiting" : `1 of ${queue.length} waiting`}
          </div>
        </div>
      </header>

      {queue.length > 1 && (
        <Link href="/review/all" className="btn btn-secondary" style={{ height: 44, fontSize: 15 }}>
          Review many at once ({queue.length === 50 ? "50+" : queue.length})
        </Link>
      )}

      {queue.length > 1 && queue.length <= 12 && (
        <div style={{ display: "flex", gap: 6 }} aria-hidden="true">
          {queue.map((f, i) => (
            <div
              key={f.id}
              style={{ flexGrow: 1, height: 4, borderRadius: 2, background: i === 0 ? "var(--green)" : "#deded7" }}
            />
          ))}
        </div>
      )}

      {food ? (
        <ReviewCard
          key={food.id}
          food={food}
          by={by}
          ago={ago(food.created_at)}
          photoUrl={photo}
          similar={similar}
        />
      ) : (
        <div className="card" style={{ alignItems: "center", textAlign: "center", padding: 32 }}>
          <h2>All caught up</h2>
          <p className="muted">No foods from friends are waiting for review.</p>
          {(mineWaiting ?? 0) > 0 && (
            <p className="muted small">
              {mineWaiting} of your own {mineWaiting === 1 ? "food is" : "foods are"} waiting for someone else to
              check.
            </p>
          )}
          <Link href="/library" className="btn btn-secondary" style={{ marginTop: 8 }}>
            Back to library
          </Link>
        </div>
      )}

      <p className="muted small" style={{ textAlign: "center", lineHeight: 1.4 }}>
        You can&apos;t approve your own foods. Someone else has to check them.
      </p>
    </main>
  );
}
