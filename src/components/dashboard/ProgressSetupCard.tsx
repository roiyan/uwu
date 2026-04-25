import Link from "next/link";

export type SetupStep = {
  id: string;
  label: string;
  description: string;
  href: string;
  done: boolean;
};

export function ProgressSetupCard({ steps }: { steps: SetupStep[] }) {
  const doneCount = steps.filter((s) => s.done).length;
  const percent = Math.round((doneCount / steps.length) * 100);
  const next = steps.find((s) => !s.done);

  if (!next) {
    return (
      <section className="d-card p-7">
        <div className="flex items-center gap-4">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full text-lg"
            style={{
              background: "rgba(212, 184, 150, 0.16)",
              color: "var(--d-gold)",
            }}
          >
            ♡
          </span>
          <div>
            <h2 className="d-serif text-[22px] font-light text-[var(--d-ink)]">
              Semua siap.
            </h2>
            <p className="text-[13px] text-[var(--d-ink-dim)]">
              Undangan Anda sudah lengkap dan siap dibagikan.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="d-card p-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="d-eyebrow">Langkah selanjutnya</p>
          <h2 className="d-serif mt-2 text-[26px] font-light text-[var(--d-ink)]">
            Ceklis kecil yang membuat undangan{" "}
            <em className="d-serif italic text-[var(--d-coral)]">sempurna</em>.
          </h2>
        </div>
        <div className="text-right">
          <p className="d-serif text-[18px] font-light text-[var(--d-ink)]">
            <em className="d-serif italic text-[var(--d-coral)]">{doneCount}</em>
            <span className="text-[var(--d-ink-dim)]">/{steps.length}</span>
          </p>
          <p className="d-mono text-[10px] uppercase tracking-[0.22em] text-[var(--d-ink-dim)]">
            {percent}% selesai
          </p>
        </div>
      </div>

      <div className="mt-4 h-[6px] w-full overflow-hidden rounded-full bg-[var(--d-bg-2)]">
        <div
          className="h-full rounded-full"
          style={{
            width: `${percent}%`,
            background:
              "linear-gradient(90deg, var(--d-coral) 0%, var(--d-peach) 100%)",
            boxShadow: "0 0 14px rgba(240, 160, 156, 0.45)",
            transition: "width 800ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      </div>

      <ul className="mt-6 space-y-2">
        {steps.map((step) => {
          const isNext = step === next;
          return (
            <li
              key={step.id}
              className={`flex items-center justify-between gap-4 rounded-[12px] px-4 py-3 ${
                isNext
                  ? "border border-[rgba(240,160,156,0.18)] bg-[rgba(240,160,156,0.04)]"
                  : "border border-transparent"
              }`}
            >
              <div className="flex items-center gap-4">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-medium ${
                    step.done
                      ? "bg-[rgba(126,211,164,0.14)] text-[var(--d-green)]"
                      : isNext
                        ? "bg-[var(--d-coral)] text-white"
                        : "bg-[var(--d-bg-2)] text-[var(--d-ink-faint)]"
                  }`}
                >
                  {step.done ? "✓" : ""}
                </span>
                <div>
                  <p className="text-[14px] font-medium text-[var(--d-ink)]">
                    {step.label}
                  </p>
                  <p className="text-[12px] text-[var(--d-ink-dim)]">
                    {step.description}
                  </p>
                </div>
              </div>
              {!step.done && (
                <Link
                  href={step.href}
                  className="d-mono shrink-0 text-[10px] uppercase tracking-[0.22em] text-[var(--d-coral)] transition-colors hover:text-[var(--d-peach)]"
                >
                  Lanjut →
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
