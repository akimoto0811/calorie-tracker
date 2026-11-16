"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { shrink } from "@/lib/image";
import { Camera, Close } from "./icons";

/** Optional picture of the food, so it's easy to recognise in the library. */
export function FoodPhotoField({
  initialUrl,
  onChange,
}: {
  initialUrl: string | null;
  onChange: (path: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    const local = URL.createObjectURL(file);
    setPreview(local);
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid) throw new Error("Please sign in again.");
      const blob = await shrink(file, 1200);
      const path = `${uid}/food-${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage
        .from("label-photos")
        .upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (error) throw new Error("Upload failed: " + error.message);
      onChange(path);
    } catch (e) {
      setPreview(initialUrl);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="field">
      <span className="label">Photo of the food</span>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          type="button"
          className="food-photo"
          onClick={() => inputRef.current?.click()}
          aria-label={preview ? "Change photo" : "Add a photo"}
          disabled={busy}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" />
          ) : (
            <Camera size={24} />
          )}
          {busy && (
            <span className="food-photo-busy">
              <span className="spinner" />
            </span>
          )}
        </button>
        <div className="stack" style={{ gap: 4 }}>
          <button type="button" className="link-btn" style={{ alignSelf: "flex-start" }} onClick={() => inputRef.current?.click()} disabled={busy}>
            {preview ? "Change photo" : "Add a photo"}
          </button>
          {preview && !busy && (
            <button
              type="button"
              className="link-btn danger"
              style={{ alignSelf: "flex-start", fontSize: 13, display: "inline-flex", gap: 4, alignItems: "center" }}
              onClick={() => {
                setPreview(null);
                onChange(null);
              }}
            >
              <Close size={14} />
              Remove
            </button>
          )}
          {!preview && <span className="muted small">Optional. Helps everyone spot it in the library.</span>}
        </div>
      </div>
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
