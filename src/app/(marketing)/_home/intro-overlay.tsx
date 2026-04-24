"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "uwu_intro_seen_v3";

// First-visit wordmark reveal. On return visits we skip the animation
// entirely (never render the overlay), and we NEVER toggle
// `.intro-gating` on <html>, so the hero cascade is never hidden —
// this guarantees hero text is visible even if JS fails.
//
// First visits:
//   1. Mount → add `.intro-gating` to <html> (cascade is now hidden)
//   2. After 2800ms → add `.intro-done` (cascade animates in)
//   3. After 3800ms → overlay unmounts
//
// The wordmark is rendered inline (SVG + styled text) so it cannot
// silently fail to load.
export function IntroOverlay() {
  const [phase, setPhase] = useState<"loading" | "fading" | "hidden">(
    "loading",
  );

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      /* Safari private mode — treat as first-visit */
    }

    const root = document.documentElement;

    if (seen) {
      // Return visit: no intro, no gating, just show the page.
      setPhase("hidden");
      return;
    }

    // First visit: gate the cascade, play the intro, then release.
    root.classList.add("intro-gating");

    const t1 = window.setTimeout(() => {
      setPhase("fading");
      root.classList.add("intro-done");
      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* noop */
      }
    }, 2800);

    const t2 = window.setTimeout(() => {
      setPhase("hidden");
    }, 3800);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  if (phase === "hidden") return null;

  return (
    <div
      className={`intro${phase === "fading" ? " done" : ""}`}
      aria-hidden="true"
      id="introOverlay"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/UWU_with_text.svg"
        alt=""
        className="intro-logo"
        draggable={false}
      />
      <div className="intro-caption">A Love Story · Beautifully Told</div>
    </div>
  );
}
