"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const STORAGE_KEY = "uwu_intro_seen_v3";

// First-visit logo reveal. Once dismissed (or on return visits) the root
// element gains `.intro-done` which unblocks hero cascade animations.
export function IntroOverlay() {
  // Start "done" if we can't read sessionStorage or the flag is set. This
  // guarantees SSR output keeps the overlay hidden for returning visitors
  // (avoids a flash) and prevents hydration mismatch by only applying the
  // sessionStorage-gated behavior after mount.
  const [done, setDone] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      // Safari private mode etc. — act as first-visit.
    }

    const root = document.documentElement;

    if (seen) {
      setDone(true);
      setHidden(true);
      root.classList.add("intro-done");
      return;
    }

    const t1 = window.setTimeout(() => {
      setDone(true);
      root.classList.add("intro-done");
      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* noop */
      }
    }, 2800);

    const t2 = window.setTimeout(() => {
      setHidden(true);
    }, 3800);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  if (hidden) return null;

  return (
    <div
      className={`intro${done ? " done" : ""}`}
      aria-hidden="true"
      id="introOverlay"
    >
      <Image
        src="/images/homepage/uwu-logo.svg"
        alt=""
        width={640}
        height={240}
        className="intro-logo"
        priority
      />
      <div className="intro-caption">A Love Story · Beautifully Told</div>
    </div>
  );
}
