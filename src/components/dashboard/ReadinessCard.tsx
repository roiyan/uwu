import Link from "next/link";

export type ReadinessStep = {
  id: string;
  label: string;
  href: string;
  done: boolean;
};

export function ReadinessCard({ steps }: { steps: ReadinessStep[] }) {
  const doneCount = steps.filter((s) => s.done).length;
  const percent = Math.round((doneCount / steps.length) * 100);

  return (
    <section className="rounded-[18px] border border-[var(--d-line)] bg-[var(--d-bg-card)] p-7">
      <header>
        <p className="d-eyebrow">Kesiapan</p>
        <h2 className="d-serif mt-2 text-[22px] font-extralight leading-tight text-[var(--d-ink)]">
          Undangan kalian{" "}
          <em className="d-serif italic text-[var(--d-coral)]">
            {percent}% siap.
          </em>
        </h2>
      </header>

      <ul className="mt-6 space-y-4">
        {steps.map((step) => {
          const Row = (
            <div className="flex items-center gap-3">
              <span className="d-mono w-[150px] shrink-0 truncate text-[12.5px] text-[var(--d-ink-dim)]">
                {step.label}
              </span>
              <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-[var(--d-bg-2)]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: step.done ? "100%" : "0%",
                    background: step.done
                      ? "linear-gradient(90deg, var(--d-coral) 0%, var(--d-peach) 100%)"
                      : "transparent",
                    boxShadow: step.done
                      ? "0 0 12px rgba(240,160,156,0.45)"
                      : undefined,
                  }}
                />
              </div>
              <span
                aria-hidden
                className="w-4 shrink-0 text-center text-[14px]"
                style={{
                  color: step.done
                    ? "var(--d-green)"
                    : "var(--d-ink-faint)",
                }}
              >
                {step.done ? "✓" : "✗"}
              </span>
            </div>
          );

          if (step.done) {
            return <li key={step.id}>{Row}</li>;
          }
          return (
            <li key={step.id}>
              <Link
                href={step.href}
                className="block rounded-md transition-colors hover:bg-[var(--d-bg-2)]/40"
              >
                {Row}
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="d-serif mt-5 text-[12.5px] italic leading-relaxed text-[var(--d-ink-dim)]">
        Lengkapi semua langkah untuk undangan yang sempurna.
      </p>
    </section>
  );
}
