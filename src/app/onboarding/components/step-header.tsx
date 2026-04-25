/**
 * Reusable header rendered above every onboarding step's form.
 * Eyebrow + serif title + sub-copy. Pure presentational.
 */
export function StepHeader({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: React.ReactNode;
  sub?: string;
}) {
  return (
    <header className="mb-10">
      <p className="ob-mono text-[10px] uppercase tracking-[0.32em] text-[var(--ob-ink-dim)]">
        {eyebrow}
      </p>
      <h2 className="ob-serif mt-4 text-[36px] font-extralight leading-[1.1] tracking-[-0.01em] text-[var(--ob-ink)] md:text-[42px]">
        {title}
      </h2>
      {sub && (
        <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-[var(--ob-ink-dim)]">
          {sub}
        </p>
      )}
    </header>
  );
}
