"use client";

import { useEffect } from "react";
import { releaseMockGate } from "@/lib/api/client";
import { worker } from "./browser";

/**
 * Starts the MSW service worker, then reports ready. Loaded with next/dynamic `ssr: false`
 * because `msw/browser` has no server build.
 */
export default function MswStarter({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    let cancelled = false;
    worker
      .start({ onUnhandledFrame: "bypass", quiet: true })
      .catch((err) => console.error("[mocks] failed to start", err))
      .finally(() => {
        // Release even if start failed: requests then fail visibly instead of hanging.
        releaseMockGate();
        if (!cancelled) onReady();
      });
    return () => {
      cancelled = true;
    };
  }, [onReady]);
  return null;
}
