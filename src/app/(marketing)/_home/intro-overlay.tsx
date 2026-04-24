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
      <IntroWordmark />
      <div className="intro-caption">A Love Story · Beautifully Told</div>
    </div>
  );
}

// Inline wordmark: `uwu` in Fraunces italic with a small heart above
// the middle `w`. Uses the site's brand gradient tokens so it keeps
// visual identity with the nav logo without depending on a raster/SVG
// asset download.
function IntroWordmark() {
  return (
    <div className="intro-logo">
      <svg
        viewBox="0 0 640 240"
        role="img"
        aria-label="uwu"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="uwuGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8FA3D9" />
            <stop offset="40%" stopColor="#B89DD4" />
            <stop offset="75%" stopColor="#F0A09C" />
            <stop offset="100%" stopColor="#F4B8A3" />
          </linearGradient>
        </defs>
        {/* heart above middle `w` */}
        <path
          d="M320 36 C 310 22, 290 22, 290 44 C 290 62, 320 78, 320 78 C 320 78, 350 62, 350 44 C 350 22, 330 22, 320 36 Z"
          fill="url(#uwuGrad)"
          opacity="0.95"
        />
        <text
          x="320"
          y="200"
          textAnchor="middle"
          fontFamily="var(--font-fraunces), 'Fraunces', 'Playfair Display', serif"
          fontStyle="italic"
          fontWeight="300"
          fontSize="180"
          letterSpacing="-0.02em"
          fill="url(#uwuGrad)"
        >
          uwu
        </text>
      </svg>
    </div>
  );
}
