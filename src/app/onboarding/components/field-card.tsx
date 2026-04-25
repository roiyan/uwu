/**
 * Dark card wrapper used to group form fields. Eyebrow + optional
 * description, then children render the actual fields.
 */
export function FieldCard({
  eyebrow,
  title,
  description,
  children,
  className = "",
}: {
  eyebrow?: string;
  title?: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[18px] border border-[var(--ob-line)] bg-[var(--ob-bg-card)] p-6 md:p-8 ${className}`}
    >
      {(eyebrow || title) && (
        <header className="mb-6">
          {eyebrow && (
            <p className="ob-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ob-ink-dim)]">
              {eyebrow}
            </p>
          )}
          {title && (
            <h3 className="ob-serif mt-2 text-[22px] font-light text-[var(--ob-ink)]">
              {title}
            </h3>
          )}
          {description && (
            <p className="mt-2 text-[13px] text-[var(--ob-ink-dim)]">
              {description}
            </p>
          )}
        </header>
      )}
      {children}
    </section>
  );
}
