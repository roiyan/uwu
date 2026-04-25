"use client";

import Link from "next/link";

/**
 * Tonal-layered empty state matching the dashboard dark idiom. Card
 * uses `--d-bg-card` with a faint border, the icon sits in a coral-tint
 * disc, and the optional CTA renders as the gradient pill we use for
 * primary actions (matches the "Simpan" buttons on Settings).
 *
 * Either pass `actionHref` for a Link CTA, or `onAction` for an
 * in-page handler (e.g. opening the add-tamu dialog instead of
 * navigating). Falling back to `actionHref="#"` is no longer needed.
 */
export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  note,
}: {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  note?: string;
}) {
  const cta =
    actionLabel && (actionHref || onAction)
      ? actionHref
        ? (
            <Link
              href={actionHref}
              className="d-mono mt-7 inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#8FA3D9_0%,#B89DD4_50%,#F0A09C_100%)] px-7 py-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-white shadow-[0_18px_40px_-18px_rgba(240,160,156,0.6)] transition-opacity hover:opacity-90"
            >
              {actionLabel}
            </Link>
          )
        : (
            <button
              type="button"
              onClick={onAction}
              className="d-mono mt-7 inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#8FA3D9_0%,#B89DD4_50%,#F0A09C_100%)] px-7 py-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-white shadow-[0_18px_40px_-18px_rgba(240,160,156,0.6)] transition-opacity hover:opacity-90"
            >
              {actionLabel}
            </button>
          )
      : null;

  return (
    <section className="d-card mx-auto max-w-2xl p-10 text-center md:p-12">
      <div
        aria-hidden
        className="d-serif mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl"
        style={{
          background: "rgba(240,160,156,0.08)",
          color: "var(--d-coral)",
          border: "1px solid rgba(240,160,156,0.22)",
        }}
      >
        {icon}
      </div>
      <h2 className="d-serif mt-5 text-[24px] font-extralight leading-[1.15] text-[var(--d-ink)] md:text-[28px]">
        {title}
      </h2>
      <p className="mx-auto mt-3 max-w-md text-[13.5px] leading-relaxed text-[var(--d-ink-dim)]">
        {description}
      </p>
      {cta}
      {note && (
        <p className="d-mono mt-5 text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-faint)]">
          {note}
        </p>
      )}
    </section>
  );
}
