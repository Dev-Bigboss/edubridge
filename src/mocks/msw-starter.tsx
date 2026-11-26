"use client";

import { useEffect } from "react";
import { releaseMockGate } from "@/lib/api/client";
import { worker } from "./browser";

/**
 * One start per page load. React runs effects twice in development (and remounts on fast
 * refresh), and a second `worker.start()` throws "already enabled"; sharing the promise means
 * every caller waits for the same, real start.
 */
let started: Promise<boolean> | null = null;
function startOnce(): Promise<boolean> {
  started ??= worker
    .start({ onUnhandledFrame: "bypass", quiet: true })
    .then(() => true)
    .catch((err) => {
      console.error("[mocks] failed to start", err);
      return false;
    });
  return started;
}

/**
 * Starts the MSW service worker, then reports ready. Loaded with next/dynamic `ssr: false`
 * because `msw/browser` has no server build.
 */
export default function MswStarter({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    let cancelled = false;
    void startOnce().then((ok) => {
      // If the worker failed, api() refuses every call instead of reaching a real backend.
      releaseMockGate(ok);
      if (!cancelled) onReady();
    });
    return () => {
      cancelled = true;
    };
  }, [onReady]);
  return null;
}
