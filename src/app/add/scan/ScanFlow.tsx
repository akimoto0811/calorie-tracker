"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FoodForm } from "@/components/FoodForm";
import { emptyDraft, type FoodDraft, type Meal } from "@/lib/types";
import { Alert } from "@/components/icons";
import { useBarcodeCamera } from "@/components/useBarcodeCamera";

type Phase =
  | { kind: "scanning" }
  | { kind: "looking", code: string }
  | { kind: "form", draft: FoodDraft, note: string | null }
  | { kind: "error", message: string };

export function ScanFlow({ meal, date, today, qs }: { meal: Meal; date: string; today: string; qs: string }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "scanning" });
  const [typed, setTyped] = useState("");

  const lookup = useCallback(
    async (code: string) => {
      setPhase({ kind: "looking", code });
      try {
        const res = await fetch(`/api/barcode/${encodeURIComponent(code)}`);
        const body = await res.json();
        if (body.kind === "library") {
          router.replace(`/add/food/${body.foodId}?${qs}`);
        } else if (body.kind === "off") {
          const { per, ...draft } = body.draft as FoodDraft & { per: string };
          setPhase({
            kind: "form",
            draft,
            note:
              per === "100g"
                ? "Found it. This product only lists values per 100 g, so set how many 100 g portions you had."
                : "Found it. Check the values match the pack before saving.",
          });
        } else {
          setPhase({
            kind: "form",
            draft: { ...emptyDraft("barcode"), barcode: code },
            note: "We couldn't find this barcode. Enter the details once and it will be remembered.",
          });
        }
      } catch {
        setPhase({ kind: "error", message: "Couldn't look up that barcode. Check your connection and try again." });
      }
    },
    [qs, router],
  );

  useBarcodeCamera(videoRef, phase.kind === "scanning", lookup, (message) => setPhase({ kind: "error", message }));

  if (phase.kind === "form") {
    return (
      <>
        {phase.note && <div className="notice ok">{phase.note}</div>}
        <FoodForm initial={phase.draft} meal={meal} date={date} today={today} defaultShare={false} />
      </>
    );
  }

  return (
    <div className="stack" style={{ gap: 16 }}>
      {phase.kind === "scanning" && (
        <>
          <div className="scanner">
            <video ref={videoRef} muted playsInline aria-label="Camera preview" />
            <div className="frame" aria-hidden="true" />
          </div>
          <p className="muted small" style={{ textAlign: "center" }}>
            Point the camera at the barcode. It scans automatically.
          </p>
        </>
      )}
      {phase.kind === "looking" && (
        <div className="card" style={{ alignItems: "center", padding: 32 }}>
          <span className="spinner" style={{ color: "var(--green)", width: 28, height: 28 }} />
          <div>Looking up {phase.code}…</div>
        </div>
      )}
      {phase.kind === "error" && (
        <div className="notice warn" role="alert">
          <Alert size={16} />
          <span>{phase.message}</span>
        </div>
      )}

      <form
        className="stack"
        style={{ gap: 8 }}
        onSubmit={(e) => {
          e.preventDefault();
          const code = typed.replace(/\D/g, "");
          if (code.length >= 6) lookup(code);
        }}
      >
        <label htmlFor="code" style={{ fontSize: 14, fontWeight: 600 }}>
          Or type the barcode number
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            id="code"
            className="input lg"
            inputMode="numeric"
            placeholder="e.g. 5000159484695"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />
          <button className="btn btn-secondary" style={{ width: "auto" }}>
            Look up
          </button>
        </div>
      </form>
      {phase.kind === "error" && (
        <button type="button" className="btn btn-secondary" onClick={() => setPhase({ kind: "scanning" })}>
          Try the camera again
        </button>
      )}
    </div>
  );
}
