"use client";

import { useEffect, useState } from "react";

/**
 * Lightweight client-side store for the onboarding sidebar's live
 * preview card. Decoupled from each step's form state on purpose —
 * the persisted save path stays in the existing form.tsx files;
 * this is purely cosmetic mirror of what the user is typing.
 *
 * Mechanism:
 *  - Each step's form pushes partial updates via writePreview().
 *  - localStorage is the source of truth across step navigations.
 *  - A custom event broadcasts changes within the current tab so the
 *    sidebar can re-render without listening to "storage" (which only
 *    fires for cross-tab writes).
 */

export type OnboardingPreview = {
  brideName: string;
  brideNickname: string;
  groomName: string;
  groomNickname: string;
  eventDate: string;
  venue: string;
  themeSlug: string | null;
};

const STORAGE_KEY = "uwu:onboarding-preview";
const EVENT_NAME = "uwu:onboarding-preview-update";

const EMPTY: OnboardingPreview = {
  brideName: "",
  brideNickname: "",
  groomName: "",
  groomNickname: "",
  eventDate: "",
  venue: "",
  themeSlug: null,
};

function readPreview(): OnboardingPreview {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<OnboardingPreview>;
    return { ...EMPTY, ...parsed };
  } catch {
    return EMPTY;
  }
}

export function writePreview(partial: Partial<OnboardingPreview>) {
  if (typeof window === "undefined") return;
  const next = { ...readPreview(), ...partial };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota or private mode — fall back to in-memory event only.
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: next }));
}

/**
 * Subscribe the sidebar to live preview changes. Server renders with
 * EMPTY so the markup matches; after hydration the effect populates
 * from localStorage and listens for in-tab updates.
 */
export function useOnboardingPreview(): OnboardingPreview {
  const [preview, setPreview] = useState<OnboardingPreview>(EMPTY);

  useEffect(() => {
    setPreview(readPreview());
    const onUpdate = (e: Event) => {
      const detail = (e as CustomEvent<OnboardingPreview>).detail;
      if (detail) setPreview(detail);
    };
    window.addEventListener(EVENT_NAME, onUpdate);
    return () => window.removeEventListener(EVENT_NAME, onUpdate);
  }, []);

  return preview;
}

/**
 * Hydrates the preview store from server-loaded onboarding data so
 * the sidebar shows the right names/date/venue/theme on a fresh page
 * load (e.g. user comes back to step 2 — sidebar should already have
 * names from step 1, even before they touch any input).
 */
export function HydratePreview(props: Partial<OnboardingPreview>) {
  useEffect(() => {
    writePreview(props);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
