import Link from "next/link";

export type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  href?: string;
  cta?: string;
  /** Override the CTA's accessible name. Useful when two visible CTAs
   *  share the same text on the same page — without this, screen
   *  readers announce both links identically. */
  ariaLabel?: string;
};

/**
 * Dynamic preparation checklist. Renders ALL items so the couple can
 * see what they've already done — completed rows fade with a strike
 * so the active row is the visual anchor. CTA on pending rows is now
 * a proper button-styled link with hover state, not a muted text link.
 */
export function DynamicChecklist({ items }: { items: ChecklistItem[] }) {
  const doneCount = items.filter((i) => i.done).length;
  const total = items.length;
  const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <section className="d-card p-6 lg:p-7">
      <div className="flex items-center justify-between">
        <p className="d-mono text-[9.5px] uppercase tracking-[0.22em] text-[var(--d-coral)]">
          Persiapan kalian
        </p>
        <p className="d-mono text-[10px] text-[var(--d-ink-faint)]">
          {doneCount}/{total}
        </p>
      </div>

      <div
        className="mt-4 h-[3px] overflow-hidden rounded-full"
        style={{ background: "var(--d-line)" }}
      >
        <span
          aria-hidden
          className="block h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            background:
              progress === 100
                ? "var(--d-green)"
                : "linear-gradient(90deg, var(--d-coral), var(--d-lilac))",
          }}
        />
      </div>

      <ul className="mt-5 divide-y divide-[var(--d-line)]">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                aria-hidden
                className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border-[1.5px]"
                style={{
                  borderColor: item.done
                    ? "var(--d-green)"
                    : "var(--d-line-strong)",
                  background: item.done ? "rgba(126,211,164,0.16)" : "transparent",
                  color: "var(--d-green)",
                  fontSize: "11px",
                  lineHeight: 1,
                }}
              >
                {item.done ? "✓" : ""}
              </span>
              <span
                className={
                  item.done
                    ? "d-serif text-[13px] text-[var(--d-ink-dim)] opacity-60 line-through"
                    : "d-serif text-[15px] text-[var(--d-ink)]"
                }
              >
                {item.label}
              </span>
            </div>
            {!item.done && item.href && item.cta && (
              <Link
                href={item.href}
                aria-label={item.ariaLabel}
                className="d-mono inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[8px] border px-3.5 py-1.5 text-[11px] uppercase tracking-[0.12em] transition-all hover:bg-[var(--d-coral)] hover:text-[#0B0B15]"
                style={{
                  borderColor: "var(--d-coral)",
                  color: "var(--d-coral)",
                  minHeight: "36px",
                }}
              >
                {item.cta}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
