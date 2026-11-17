"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewFoods } from "@/app/actions";
import { fmt } from "@/lib/nutrition";
import type { Food } from "@/lib/types";

/** Waiting foods with tick boxes: approve or reject the ticked ones in one go. */
export function ReviewList({ foods, by }: { foods: Food[]; by: Record<string, string> }) {
  const router = useRouter();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const all = picked.size === foods.length && foods.length > 0;
  const ids = useMemo(() => [...picked], [picked]);

  function toggle(id: string) {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
  }

  function decide(decision: "approve" | "reject") {
    setMsg(null);
    start(async () => {
      const r = await reviewFoods({ ids, decision, note });
      if (!r.ok) return setMsg({ ok: false, text: r.error });
      const word = decision === "approve" ? "approved" : "rejected";
      setMsg({
        ok: r.failed.length === 0,
        text:
          `${r.done} ${r.done === 1 ? "food" : "foods"} ${word}.` +
          (r.failed.length
            ? ` ${r.failed.length} couldn't be (for example your own food, if you're not the app owner).`
            : ""),
      });
      setPicked(new Set());
      setRejecting(false);
      setNote("");
      router.refresh();
    });
  }

  if (foods.length === 0) {
    return (
      <div className="card" style={{ alignItems: "center", textAlign: "center", padding: 32 }}>
        <h2>All caught up</h2>
        <p className="muted">No foods are waiting for review.</p>
        {msg && <div className={msg.ok ? "notice ok" : "notice warn"}>{msg.text}</div>}
        <Link href="/library" className="btn btn-secondary" style={{ marginTop: 8 }}>
          Back to library
        </Link>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <label
          style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, fontSize: 14 }}
          className="grow"
        >
          <input
            type="checkbox"
            checked={all}
            onChange={() => setPicked(all ? new Set() : new Set(foods.map((f) => f.id)))}
            style={{ width: 20, height: 20 }}
          />
          Select all
        </label>
        <span className="muted small">{picked.size} ticked</span>
      </div>

      <div className="list" style={{ paddingBottom: 150 }}>
        {foods.map((f) => (
          <label key={f.id} className="row" style={{ cursor: "pointer", alignItems: "flex-start" }}>
            <input
              type="checkbox"
              checked={picked.has(f.id)}
              onChange={() => toggle(f.id)}
              style={{ width: 20, height: 20, marginTop: 2, flexShrink: 0 }}
            />
            <div className="grow" style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{f.name}</div>
              {(f.local_name || f.brand) && (
                <div className="muted" style={{ fontSize: 13 }}>
                  {[f.local_name, f.brand].filter(Boolean).join(" · ")}
                </div>
              )}
              <div className="muted small">
                {fmt(f.kcal)} kcal · {f.serving_label} · P {fmt(f.protein_g, 1)} C {fmt(f.carbs_g, 1)} F{" "}
                {fmt(f.fat_g, 1)}
              </div>
              <div className="muted small">Sent by {by[f.id]}</div>
            </div>
          </label>
        ))}
      </div>

      {/* Action bar fixed to the bottom of the screen. */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          background: "var(--bg)",
          borderTop: "1px solid var(--line)",
          padding: "12px 16px calc(12px + env(safe-area-inset-bottom))",
          zIndex: 10,
        }}
      >
        <div className="stack" style={{ gap: 8, maxWidth: 520, margin: "0 auto" }}>
          {msg && (
            <div className={msg.ok ? "notice ok" : "notice warn"} role="status">
              {msg.text}
            </div>
          )}
          {rejecting && (
            <input
              className="input"
              placeholder="Why? (optional, the sender sees this)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          )}
          <div style={{ display: "flex", gap: 8 }}>
            {rejecting ? (
              <>
                <button
                  className="btn btn-secondary"
                  style={{ width: "auto" }}
                  onClick={() => setRejecting(false)}
                  disabled={pending}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => decide("reject")}
                  disabled={pending || picked.size === 0}
                >
                  {pending ? <span className="spinner" /> : `Reject ${picked.size}`}
                </button>
              </>
            ) : (
              <>
                <button
                  className="btn btn-secondary"
                  style={{ width: "auto" }}
                  onClick={() => setRejecting(true)}
                  disabled={pending || picked.size === 0}
                >
                  Reject
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => decide("approve")}
                  disabled={pending || picked.size === 0}
                >
                  {pending ? <span className="spinner" /> : `Approve ${picked.size || ""}`.trim()}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
