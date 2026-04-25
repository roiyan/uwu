"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";

/**
 * Mobile-only top bar with a hamburger that slides the dashboard
 * sidebar in as an overlay drawer. Desktop never sees this — the
 * sidebar is always rendered alongside the main pane on lg+.
 */
export function MobileTopBar({
  coupleLabel,
  themeLabel,
  packageLabel,
  previewHref,
}: {
  coupleLabel?: string | null;
  themeLabel?: string | null;
  packageLabel?: string | null;
  previewHref?: string;
}) {
  const [open, setOpen] = useState(false);

  // Close drawer when the viewport grows past the lg breakpoint.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Lock body scroll while drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <header
        className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--d-line)] px-5 py-3 backdrop-blur lg:hidden"
        style={{ background: "rgba(12, 12, 21, 0.85)" }}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Buka menu"
          className="rounded-full border border-[var(--d-line-strong)] px-3 py-2 text-[14px] text-[var(--d-ink)]"
        >
          ☰
        </button>
        <p className="d-serif truncate text-[15px] font-light text-[var(--d-ink)]">
          {coupleLabel ?? "uwu"}
        </p>
        <span aria-hidden className="w-[40px]" />
      </header>

      {/* Drawer overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 left-0 max-w-[85%]">
            <Sidebar
              coupleLabel={coupleLabel}
              themeLabel={themeLabel}
              packageLabel={packageLabel}
              previewHref={previewHref}
              responsive={false}
              onCloseMobile={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
