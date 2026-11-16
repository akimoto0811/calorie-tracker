"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FoodForm } from "@/components/FoodForm";
import { EXTRA_NUTRIENTS, emptyDraft, type FoodDraft, type Meal } from "@/lib/types";
import { Alert, Camera, Check } from "@/components/icons";
import type { LabelReading } from "@/lib/ai/types";

type Phase =
  | { kind: "pick" }
  | { kind: "reading"; preview: string }
  | { kind: "review"; preview: string; draft: FoodDraft; uncertain: string[]; note: string | null; provider: string }
  | { kind: "error"; preview: string | null; message: string; path: string | null };

/** Shrinks a photo to at most 1600 px on the long side, as JPEG, so uploads are quick. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", 0.85));
}

export function LabelFlow({ userId, meal, date, today }: { userId: string; meal: Meal; date: string; today: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "pick" });

  async function read(path: string, preview: string) {
    setPhase({ kind: "reading", preview });
    try {
      const res = await fetch("/api/read-label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Couldn't read the label.");
      const reading = body.reading as LabelReading;
      const draft: FoodDraft = {
        ...emptyDraft("label"),
        label_photo_path: path,
        name: reading.name ?? "",
        brand: reading.brand ?? "",
        serving_label: reading.serving_label ?? "1 serving",
        kcal: reading.values.kcal ?? 0,
        protein_g: reading.values.protein_g ?? 0,
        carbs_g: reading.values.carbs_g ?? 0,
        fat_g: reading.values.fat_g ?? 0,
        ...Object.fromEntries(EXTRA_NUTRIENTS.map((k) => [k, reading.values[k] ?? null])),
      };
      // Anything the AI left empty for a core value also needs a look.
      const missing = (["kcal", "protein_g", "carbs_g", "fat_g"] as const).filter((k) => reading.values[k] == null);
      setPhase({
        kind: "review",
        preview,
        draft,
        uncertain: [...new Set([...reading.uncertain, ...missing, ...(reading.name ? [] : ["name"])])],
        note: reading.note,
        provider: body.provider ?? "The AI",
      });
    } catch (e) {
      setPhase({ kind: "error", preview, message: (e as Error).message, path });
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setPhase({ kind: "reading", preview });
    try {
      const blob = await shrink(file);
      const path = `${userId}/${crypto.randomUUID()}.jpg`;
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("label-photos")
        .upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (error) throw new Error("Upload failed: " + error.message);
      await read(path, preview);
    } catch (e) {
      setPhase({ kind: "error", preview, message: (e as Error).message, path: null });
    }
  }

  const picker = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      capture="environment"
      className="sr-only"
      onChange={(e) => {
        onFile(e.target.files?.[0]);
        e.target.value = "";
      }}
    />
  );

  if (phase.kind === "review") {
    return (
      <>
        {picker}
        <div className="card tight" style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={phase.preview} alt="Your label photo" className="photo-thumb" />
          <div className="stack" style={{ gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 15 }}>
              <Check size={18} style={{ color: "var(--green)" }} />
              {phase.provider === "Nobody" ? "Your label photo" : "Read from your photo"}
            </div>
            <div className="muted" style={{ fontSize: 14, lineHeight: 1.4 }}>
              {phase.provider === "Nobody"
                ? "Type the values from the label."
                : `${phase.provider} filled these in. Fix anything that looks off before you save.`}
              {phase.note ? ` ${phase.note}` : ""}
            </div>
            <button type="button" className="link-btn" style={{ alignSelf: "flex-start" }} onClick={() => inputRef.current?.click()}>
              Retake photo
            </button>
          </div>
        </div>
        <FoodForm
          key={phase.preview}
          initial={phase.draft}
          uncertain={phase.uncertain}
          meal={meal}
          date={date}
          today={today}
        />
      </>
    );
  }

  return (
    <div className="stack" style={{ gap: 16 }}>
      {picker}
      {phase.kind === "pick" && (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="card"
            style={{ alignItems: "center", padding: "40px 20px", cursor: "pointer", borderStyle: "dashed", borderWidth: 1.5 }}
          >
            <span className="method-icon" style={{ width: 64, height: 64, borderRadius: 20 }}>
              <Camera size={32} />
            </span>
            <span style={{ fontWeight: 700, fontSize: 17 }}>Take a photo of the label</span>
            <span className="muted" style={{ fontSize: 14, textAlign: "center", lineHeight: 1.4 }}>
              Get the whole nutrition table in frame, flat and in good light.
            </span>
          </button>
          <p className="muted small" style={{ textAlign: "center" }}>
            The photo is saved with the food so friends can check the numbers.
          </p>
        </>
      )}
      {phase.kind === "reading" && (
        <div className="card" style={{ alignItems: "center", padding: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={phase.preview} alt="" style={{ maxHeight: 240, maxWidth: "100%", borderRadius: 12 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="spinner" style={{ color: "var(--green)" }} />
            Reading the label…
          </div>
        </div>
      )}
      {phase.kind === "error" && (
        <>
          <div className="notice warn" role="alert">
            <Alert size={16} />
            <span>{phase.message}</span>
          </div>
          {phase.path && (
            <button type="button" className="btn btn-primary" onClick={() => read(phase.path!, phase.preview ?? "")}>
              Try reading again
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={() => inputRef.current?.click()}>
            Take another photo
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              setPhase({
                kind: "review",
                preview: phase.preview ?? "",
                draft: { ...emptyDraft("label"), label_photo_path: phase.path },
                uncertain: [],
                note: null,
                provider: "Nobody",
              })
            }
          >
            Enter the values myself
          </button>
        </>
      )}
    </div>
  );
}
