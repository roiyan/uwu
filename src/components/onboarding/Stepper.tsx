import Link from "next/link";

export type StepId = "mempelai" | "jadwal" | "tema" | "selesai";

const STEPS: { id: StepId; label: string; href: string }[] = [
  { id: "mempelai", label: "Mempelai", href: "/onboarding/mempelai" },
  { id: "jadwal", label: "Jadwal", href: "/onboarding/jadwal" },
  { id: "tema", label: "Tema", href: "/onboarding/tema" },
  { id: "selesai", label: "Selesai", href: "/onboarding/selesai" },
];

export function Stepper({ current, reached }: { current: StepId; reached: StepId[] }) {
  const reachedSet = new Set<StepId>(reached);
  const currentIdx = STEPS.findIndex((s) => s.id === current);

  return (
    <ol
      className="flex items-center justify-between gap-2"
      aria-label="Progres pembuatan undangan"
    >
      {STEPS.map((step, idx) => {
        const isActive = step.id === current;
        const isReached = reachedSet.has(step.id);
        const isPast = idx < currentIdx;
        const canNav = isReached || isPast || isActive;

        const dotBase =
          "flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors";
        const dotClass = isActive
          ? "bg-navy text-ink-inverse shadow-[0_0_0_4px_rgba(30,58,95,0.12)]"
          : canNav
            ? "bg-navy text-ink-inverse"
            : "bg-surface-muted text-ink-hint";

        const labelClass = isActive
          ? "text-navy font-medium"
          : canNav
            ? "text-ink"
            : "text-ink-hint";

        const content = (
          <div className="flex items-center gap-3">
            <span className={`${dotBase} ${dotClass}`}>{idx + 1}</span>
            <span className={`text-sm ${labelClass}`}>{step.label}</span>
          </div>
        );

        const connectorClass = canNav
          ? "bg-navy/40"
          : "bg-[color:var(--border-ghost)]";

        return (
          <li key={step.id} className="flex flex-1 items-center gap-3">
            {canNav && !isActive ? (
              <Link href={step.href}>{content}</Link>
            ) : (
              content
            )}
            {idx < STEPS.length - 1 && (
              <span className={`h-px flex-1 ${connectorClass}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
