import Link from "next/link";

/**
 * Bottom navigation strip used by every step except Selesai (which
 * has its own dual-CTA layout). The "Next" CTA can be either a
 * submit button (when the parent form should drive the action) or a
 * plain link. Steps that need form-state-aware disabled states own
 * their own button and pass `nextSlot` instead.
 */
export function OnboardingNavBar({
  backHref,
  backLabel = "← Kembali",
  nextSlot,
  hint,
}: {
  backHref?: string;
  backLabel?: string;
  nextSlot: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--ob-line)] pt-6">
      <div className="flex items-center gap-4">
        {backHref ? (
          <Link
            href={backHref}
            className="ob-mono text-[11px] uppercase tracking-[0.22em] text-[var(--ob-ink-dim)] transition-colors hover:text-[var(--ob-ink)]"
          >
            {backLabel}
          </Link>
        ) : (
          <span aria-hidden className="opacity-0 select-none">
            placeholder
          </span>
        )}
        <span className="hidden items-center gap-2 md:inline-flex">
          <span
            aria-hidden
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--ob-coral)]"
          />
          <span className="ob-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ob-ink-faint)]">
            {hint ?? "Tersimpan otomatis"}
          </span>
        </span>
      </div>
      <div>{nextSlot}</div>
    </div>
  );
}

/**
 * Brand-gradient pill used by every step's primary CTA.
 */
export function NextCta({
  type = "submit",
  disabled,
  children,
  formAction,
  href,
}: {
  type?: "submit" | "button";
  disabled?: boolean;
  children: React.ReactNode;
  formAction?: (formData: FormData) => void;
  href?: string;
}) {
  const cls =
    "inline-flex items-center gap-2 rounded-full px-7 py-3 text-[13px] font-medium tracking-wide text-white transition-opacity " +
    "bg-[linear-gradient(135deg,#8FA3D9_0%,#B89DD4_50%,#F0A09C_100%)] " +
    "hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed " +
    "shadow-[0_18px_40px_-18px_rgba(240,160,156,0.6)]";
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type={type}
      formAction={formAction}
      disabled={disabled}
      className={cls}
    >
      {children}
    </button>
  );
}
