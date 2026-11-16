"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Barcode, Close } from "./icons";
import { useBarcodeCamera } from "./useBarcodeCamera";

/** Optional barcode for a food, typed or scanned, so the next scan finds it in the library. */
export function BarcodeField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useBarcodeCamera(
    videoRef,
    scanning,
    (code) => {
      onChange(code);
      setScanning(false);
    },
    (message) => {
      setError(message);
      setScanning(false);
    },
  );

  useEffect(() => {
    if (!scanning) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setScanning(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [scanning]);

  return (
    <div className="field">
      <label htmlFor="f-barcode" className="label">
        Barcode
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          id="f-barcode"
          className="input"
          inputMode="numeric"
          autoComplete="off"
          placeholder="Optional"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))}
        />
        <button
          type="button"
          className="btn btn-secondary"
          style={{ width: "auto", flexShrink: 0, gap: 6, padding: "0 14px" }}
          onClick={() => {
            setError(null);
            setScanning(true);
          }}
        >
          <Barcode size={18} />
          Scan
        </button>
      </div>
      <span className="muted small">Next time anyone scans this barcode, this food comes up.</span>
      {error && (
        <div className="notice warn" role="alert">
          <Alert size={16} />
          <span>{error}</span>
        </div>
      )}
      {scanning && (
        <div className="sheet-wrap" role="dialog" aria-modal="true" aria-label="Scan barcode">
          <div className="sheet-backdrop" onClick={() => setScanning(false)} />
          <div className="sheet" style={{ height: "auto", paddingBottom: "calc(20px + env(safe-area-inset-bottom))" }}>
            <div className="sheet-head">
              <div className="sheet-grip" aria-hidden="true" />
              <div className="between" style={{ alignItems: "center" }}>
                <h2 style={{ fontSize: 18 }}>Scan barcode</h2>
                <button type="button" className="icon-btn" aria-label="Close" onClick={() => setScanning(false)}>
                  <Close size={18} />
                </button>
              </div>
            </div>
            <div style={{ padding: "16px 20px 0" }}>
              <div className="scanner">
                <video ref={videoRef} muted playsInline aria-label="Camera preview" />
                <div className="frame" aria-hidden="true" />
              </div>
              <p className="muted small" style={{ textAlign: "center", marginTop: 10 }}>
                Point the camera at the barcode. It fills in automatically.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
