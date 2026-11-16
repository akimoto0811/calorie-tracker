"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * While `active`, reads barcodes from the back camera into `videoRef`.
 * Calls `onCode` once with the first barcode found, or `onError` if the camera can't start.
 */
export function useBarcodeCamera(
  videoRef: RefObject<HTMLVideoElement | null>,
  active: boolean,
  onCode: (code: string) => void,
  onError: (message: string) => void,
) {
  // Keep the latest callbacks without restarting the camera when they change.
  const cb = useRef({ onCode, onError });
  cb.current = { onCode, onError };

  useEffect(() => {
    if (!active) return;
    let stop: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const { BarcodeFormat, DecodeHintType } = await import("@zxing/library");
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
        ]);
        const reader = new BrowserMultiFormatReader(hints);
        if (cancelled || !videoRef.current) return;
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } } },
          videoRef.current,
          (result) => {
            if (result) {
              controls.stop();
              navigator.vibrate?.(50);
              cb.current.onCode(result.getText());
            }
          },
        );
        stop = () => controls.stop();
        if (cancelled) stop();
      } catch (e) {
        if (cancelled) return;
        const name = (e as Error)?.name;
        cb.current.onError(
          name === "NotAllowedError"
            ? "Camera access was blocked. Allow the camera for this site in your browser settings, or type the barcode below."
            : "Couldn't start the camera on this device. You can type the barcode number below.",
        );
      }
    })();

    return () => {
      cancelled = true;
      stop?.();
    };
  }, [active, videoRef]);
}
