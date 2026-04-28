import Link from "next/link";

export type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  href?: string;
  cta?: string;
};

// Dynamic next-step list. Replaces the old static "Semua siap"
// readiness card that always rendered the same canned items
// regardless of state. Pending items surface a CTA per row; the
// done-count is tucked into the footer so the rail doesn't look
// cluttered once most steps are checked off.
export function DynamicChecklist({ items }: { items: ChecklistItem[] }) {
  const doneCount = items.filter((i) => i.done).length;
  const total = items.length;
  const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const pending = items.filter((i) => !i.done).slice(0, 4);
  const allDone = pending.length === 0;

  return (
    <section className="d-card p-6 lg:p-7">
      <div className="flex items-center justify-between">
        <p className="d-mono text-[9.5px] uppercase tracking-[0.22em] text-[var(--d-coral)]">
          Langkah selanjutnya
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

      {allDone ? (
        <div className="mt-6 text-center">
          <p className="d-serif text-[16px] text-[var(--d-ink)]">
            Semua langkah{" "}
            <em className="d-serif italic text-[var(--d-green)]">selesai</em>.
          </p>
          <p className="d-serif mt-1 text-[12px] italic text-[var(--d-ink-dim)]">
            Tinggal menunggu hari bahagia.
          </p>
        </div>
      ) : (
        <ul className="mt-5 divide-y divide-[var(--d-line)]">
          {pending.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  aria-hidden
                  className="block h-[18px] w-[18px] shrink-0 rounded-[4px] border-[1.5px]"
                  style={{ borderColor: "var(--d-line-strong)" }}
                />
                <span className="d-serif text-[13px] text-[var(--d-ink)]">
                  {item.label}
                </span>
              </div>
              {item.href && item.cta && (
                <Link
                  href={item.href}
                  className="d-mono shrink-0 whitespace-nowrap text-[10px] uppercase tracking-[0.12em] text-[var(--d-coral)] transition-colors hover:text-[var(--d-peach)]"
                >
                  {item.cta}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}

      {!allDone && doneCount > 0 && (
        <p className="d-serif mt-4 flex items-center gap-1.5 text-[12px] italic text-[var(--d-ink-faint)]">
          <span aria-hidden className="text-[var(--d-green)]">
            ✓
          </span>
          {doneCount} langkah sudah selesai
        </p>
      )}
    </section>
  );
}
