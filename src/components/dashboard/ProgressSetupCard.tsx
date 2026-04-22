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
      <section className="rounded-2xl bg-surface-card p-6 shadow-ghost-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-50 text-lg text-gold-dark">
            ♡
          </span>
          <div>
            <h2 className="font-display text-lg text-ink">Semua siap!</h2>
            <p className="text-sm text-ink-muted">
              Undangan Anda sudah lengkap dan siap dibagikan.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-surface-card p-6 shadow-ghost-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-ink">Langkah selanjutnya</h2>
        <span className="text-xs font-medium text-ink-muted">
          {doneCount} dari {steps.length} selesai
        </span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full bg-coral transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>

      <ul className="mt-5 space-y-2">
        {steps.map((step) => (
          <li
            key={step.id}
            className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${
              step === next ? "bg-navy-50" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  step.done
                    ? "bg-navy text-ink-inverse"
                    : step === next
                      ? "bg-coral text-white"
                      : "bg-surface-muted text-ink-hint"
                }`}
              >
                {step.done ? "✓" : ""}
              </span>
              <div>
                <p className="text-sm font-medium text-ink">{step.label}</p>
                <p className="text-xs text-ink-muted">{step.description}</p>
              </div>
            </div>
            {!step.done && (
              <Link
                href={step.href}
                className="text-xs font-medium text-navy hover:underline"
              >
                Lanjut →
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
