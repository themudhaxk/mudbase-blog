"use client";

import { useEffect } from "react";

interface PageViewTrackerProps {
  postId: string;
}

/**
 * Fires a single tracking hit to /api/track once per page mount.
 *
 * Rendered as a client component so it runs in the browser after hydration, not during SSR
 * or ISR revalidation. Uses fetch with keepalive so the request survives if the user
 * navigates away immediately after the page loads.
 */
export function PageViewTracker({ postId }: PageViewTrackerProps): null {
  useEffect(() => {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId }),
      keepalive: true,
    }).catch(() => {
      // Tracking failures are silent. A broken analytics endpoint must never affect the reader.
    });
  }, [postId]);

  return null;
}
